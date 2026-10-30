import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { clientIp, rateLimit, route } from "@/lib/api";
import { apiSession } from "@/lib/game-sessions";

// For a game's own server (Authorization: Bearer <the game's API key>), never for browsers.
export const GET = route(async (req: Request) => {
  rateLimit(`game-api:${clientIp(req)}`, 120, 60_000);
  const key = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const token = new URL(req.url).searchParams.get("session") ?? "";
  return NextResponse.json(await apiSession(await getDb(), token, key));
});
