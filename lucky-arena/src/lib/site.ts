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

export const DEFAULT_SHARE_CAPTION = "Join me on {site} and get FREE SPINS! 🎰✨ Spin the welcome wheel and play with friends. Use my code {code}:";
const SHARE_KEYS = { caption: "share_caption", image: "share_image", bonus: "share_bonus_code" } as const;

/** The invite post players share: its words ({site}, {code} = the player's own code, {bonus} = the free-chips code), its picture and a bonus code. */
export async function getShare(db: Db): Promise<{ caption: string; image: string; bonus: string }> {
  const rows = await db.select().from(settings).where(inArray(settings.key, Object.values(SHARE_KEYS)));
  const get = (k: string) => rows.find((r) => r.key === k)?.value ?? "";
  return { caption: get(SHARE_KEYS.caption) || DEFAULT_SHARE_CAPTION, image: get(SHARE_KEYS.image), bonus: get(SHARE_KEYS.bonus) };
}

export async function saveShare(db: Db, s: { caption: string; image: string; bonus: string }) {
  for (const [key, value] of [[SHARE_KEYS.caption, s.caption.trim() || DEFAULT_SHARE_CAPTION], [SHARE_KEYS.image, s.image], [SHARE_KEYS.bonus, s.bonus.trim()]] as const) {
    await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
  }
}

/** Fills in the placeholders for one player. */
export function fillCaption(template: string, v: { site: string; code: string; bonus: string }): string {
  return template.replaceAll("{site}", v.site).replaceAll("{code}", v.code).replaceAll("{bonus}", v.bonus);
}
