import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { rateLimit, route } from "@/lib/api";
import { requireUserApi } from "@/lib/session";
import { requestGameAccount } from "@/lib/services";

/** The player tapped a linked game they have no username for: the admin gets "I want username and password for <game>". */
export const POST = route(async (req: Request) => {
  const user = await requireUserApi();
  rateLimit(`game-account-request:${user.id}`, 20, 60 * 60_000);
  const { gameId } = z.object({ gameId: z.coerce.number().int().positive() }).parse(await req.json());
  return NextResponse.json({ ok: true, ...(await requestGameAccount(await getDb(), user.id, gameId)) });
});
