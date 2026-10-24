import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { walletOptions } from "@/db/schema";
import { route } from "@/lib/api";

/** The cards the admin wrote for the wallet page (only the ones switched on). */
export const GET = route(async () => {
  const items = await (await getDb()).select().from(walletOptions).where(eq(walletOptions.active, true)).orderBy(walletOptions.sortOrder, walletOptions.id);
  return NextResponse.json({ items });
});
