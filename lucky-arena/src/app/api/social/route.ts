import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { socialLinks } from "@/db/schema";
import { route } from "@/lib/api";

/** The admin's social accounts that are switched on (public: shown to every visitor). */
export const GET = route(async () => {
  const rows = await (await getDb()).select({ id: socialLinks.id, kind: socialLinks.kind, label: socialLinks.label, url: socialLinks.url }).from(socialLinks).where(eq(socialLinks.active, true)).orderBy(socialLinks.sortOrder, socialLinks.id);
  return NextResponse.json({ links: rows });
});
