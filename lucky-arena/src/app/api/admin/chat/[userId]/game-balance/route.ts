import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { route } from "@/lib/api";
import { requireAdminApi } from "@/lib/session";
import { lobbyGames, tellGameBalance } from "@/lib/services";

/** The games the admin can pick from. */
export const GET = route(async () => {
  await requireAdminApi();
  const list = await lobbyGames(await getDb(), {});
  return NextResponse.json({ games: list.map((g) => ({ id: g.id, title: g.title })) });
});

/** Sends "🎮 <game> · N credits" to this player (the chat shows it in green). */
export const POST = route(async (req: Request, ctx: { params: Promise<{ userId: string }> }) => {
  await requireAdminApi();
  const userId = Number((await ctx.params).userId);
  const { gameId, amount } = z.object({ gameId: z.coerce.number().int().positive(), amount: z.coerce.number().int().min(0).max(100_000_000) }).parse(await req.json());
  await tellGameBalance(await getDb(), userId, gameId, amount);
  return NextResponse.json({ ok: true });
});
