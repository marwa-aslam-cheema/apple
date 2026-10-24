import { inArray } from "drizzle-orm";
import type { Db } from "@/db";
import { settings } from "@/db/schema";

export const DEFAULT_SITE_NAME = "Lucky Arena";
const NAME_KEY = "site_name";
const LOGO_KEY = "site_logo";

/** The site's name and logo, both editable by the admin. */
export async function getSite(db: Db): Promise<{ name: string; logo: string }> {
  const rows = await db.select().from(settings).where(inArray(settings.key, [NAME_KEY, LOGO_KEY]));
  const get = (k: string) => rows.find((r) => r.key === k)?.value ?? "";
  return { name: get(NAME_KEY) || DEFAULT_SITE_NAME, logo: get(LOGO_KEY) };
}

export async function saveSite(db: Db, site: { name: string; logo: string }) {
  for (const [key, value] of [[NAME_KEY, site.name.trim() || DEFAULT_SITE_NAME], [LOGO_KEY, site.logo]] as const) {
    await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
  }
}
