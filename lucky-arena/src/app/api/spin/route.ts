import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { rateLimit, route } from "@/lib/api";
import { MAX_BET, MIN_BET } from "@/lib/config";
import { requireUserApi } from "@/lib/session";
import { spinWheel } from "@/lib/services";

const bodySchema = z.object({ bet: z.coerce.number().int("Bet must be a whole number.").min(MIN_BET, `The smallest bet is ${MIN_BET}.`).max(MAX_BET, `The biggest bet is ${MAX_BET}.`).optional() });

export const POST = route(async (req: Request) => {
  const user = await requireUserApi();
  rateLimit(`spin:${user.id}`, 60, 60_000);
  const { bet } = bodySchema.parse(await req.json().catch(() => ({})));
  return NextResponse.json(await spinWheel(await getDb(), user.id, bet));
});
