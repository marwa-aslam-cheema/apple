import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { rateLimit, route } from "@/lib/api";
import { requireUserApi } from "@/lib/session";
import { requestCredits } from "@/lib/services";

const bodySchema = z.object({ gameId: z.coerce.number().int().positive().optional(), welcome: z.boolean().optional(), signup: z.boolean().optional() });

/**
 * The player asks the admin for credits; it lands in their support chat as a message. With a gameId (a game card was
 * clicked) the message names the game, and it is only sent if the player has no credits and no free spins left.
 */
export const POST = route(async (req: Request) => {
  const user = await requireUserApi();
  rateLimit(`credit-request:${user.id}`, 20, 60 * 60_000);
  const { gameId, welcome, signup } = bodySchema.parse(await req.json().catch(() => ({})));
  const result = await requestCredits(await getDb(), user.id, { gameId, welcome, signup });
  return NextResponse.json({ ok: true, ...result });
});
