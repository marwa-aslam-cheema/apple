import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { route } from "@/lib/api";
import { getGuestId } from "@/lib/session";
import { deleteChatMessage, reactChatMessage } from "@/lib/services";

const body = z.object({ action: z.enum(["delete", "react"]), emoji: z.string().max(8).nullable().optional() });

async function run(db: Awaited<ReturnType<typeof getDb>>, threadUserId: number, id: number, side: "user" | "admin", raw: unknown) {
  const b = body.parse(raw);
  if (b.action === "delete") await deleteChatMessage(db, threadUserId, id, side);
  else await reactChatMessage(db, threadUserId, id, side, b.emoji ?? null);
  return NextResponse.json({ ok: true });
}

export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const gid = await getGuestId();
  if (!gid) return NextResponse.json({ error: "No chat yet." }, { status: 404 });
  return run(await getDb(), gid, Number((await ctx.params).id), "user", await req.json());
});
