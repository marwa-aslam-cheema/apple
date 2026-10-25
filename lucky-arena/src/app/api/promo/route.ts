import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { route } from "@/lib/api";
import { getPromo, recentWins } from "@/lib/promo";

/** Public: the welcome popup, the strip's own lines and the real recent wins. */
export const GET = route(async () => {
  const db = await getDb();
  const { popup, ticker } = await getPromo(db);
  return NextResponse.json({ popup, ticker: { enabled: ticker.enabled, lines: ticker.lines, wins: ticker.enabled ? await recentWins(db) : [] } }, { headers: { "Cache-Control": "no-store" } });
});
