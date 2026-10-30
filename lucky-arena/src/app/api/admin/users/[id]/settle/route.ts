import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { route } from "@/lib/api";
import { adminSettle } from "@/lib/game-sessions";
import { requireAdminApi } from "@/lib/session";

/** Close the player's open game with the balance the admin read from the game's own back office. */
export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireAdminApi();
  const { balance } = z.object({ balance: z.number() }).parse(await req.json());
  return NextResponse.json({ ok: true, ...(await adminSettle(await getDb(), Number((await ctx.params).id), balance)) });
});
