import { eq, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { siteState } from "@/db/schema";

/** Call after the admin changes anything players see (games, promotions, wheel, social accounts). */
export async function bumpSiteVersion(db: Db) {
  await db.insert(siteState).values({ id: 1, version: 1 }).onConflictDoUpdate({ target: siteState.id, set: { version: sql`${siteState.version} + 1` } });
}

export async function getSiteVersion(db: Db): Promise<number> {
  const [row] = await db.select({ v: siteState.version }).from(siteState).where(eq(siteState.id, 1));
  return row?.v ?? 0;
}
