import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { route } from "@/lib/api";
import { requireAdminApi } from "@/lib/session";
import { deleteChatMessage, reactChatMessage } from "@/lib/services";

const body = z.object({ action: z.enum(["delete", "react"]), emoji: z.string().max(8).nullable().optional() });

async function run(db: Awaited<ReturnType<typeof getDb>>, threadUserId: number, id: number, side: "user" | "admin", raw: unknown) {
  const b = body.parse(raw);
  if (b.action === "delete") await deleteChatMessage(db, threadUserId, id, side);
  else await reactChatMessage(db, threadUserId, id, side, b.emoji ?? null);
  return NextResponse.json({ ok: true });
}

/** The admin can delete any message in a player's chat and react to it. */
export const POST = route(async (req: Request, ctx: { params: Promise<{ userId: string; id: string }> }) => {
  await requireAdminApi();
  const p = await ctx.params;
  return run(await getDb(), Number(p.userId), Number(p.id), "admin", await req.json());
});
