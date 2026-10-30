import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { route } from "@/lib/api";
import { getPromo, recentWins } from "@/lib/promo";

/** Public: the welcome popup, the strip's own lines and the real recent wins. */
export const GET = route(async () => {
  const db = await getDb();
  const { popup, ticker } = await getPromo(db);
  return NextResponse.json({ popup, ticker: { enabled: ticker.enabled, lines: ticker.lines, winTemplate: ticker.winTemplate, wins: ticker.enabled && ticker.showWins ? await recentWins(db, 10, Math.max(1, ticker.minPrize)) : [] } }, { headers: { "Cache-Control": "no-store" } });
});
