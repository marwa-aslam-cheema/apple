import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { clientIp, rateLimit, route } from "@/lib/api";
import { apiSettle } from "@/lib/game-sessions";

// For a game's own server (Authorization: Bearer <the game's API key>), never for browsers.
export const POST = route(async (req: Request) => {
  rateLimit(`game-api:${clientIp(req)}`, 120, 60_000);
  const key = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const b = await req.json().catch(() => ({})); const token = String(b.session ?? "");
  return NextResponse.json(await apiSettle(await getDb(), token, key, b.balance));
});
