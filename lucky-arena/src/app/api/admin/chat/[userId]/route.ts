import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { route } from "@/lib/api";
import { requireAdminApi } from "@/lib/session";
import { chatMeta, postChat, readChat } from "@/lib/services";

type Ctx = { params: Promise<{ userId: string }> };

export const GET = route(async (req: Request, ctx: Ctx) => {
  await requireAdminApi();
  const userId = Number((await ctx.params).userId);
  const after = Number(new URL(req.url).searchParams.get("after") ?? 0) || 0;
  const db = await getDb();
  return NextResponse.json({ messages: await readChat(db, userId, "admin", after), meta: await chatMeta(db, userId, "admin") });
});

export const POST = route(async (req: Request, ctx: Ctx) => {
  await requireAdminApi();
  const userId = Number((await ctx.params).userId);
  const { body, imageId, replyToId } = z.object({ body: z.string().max(5000), imageId: z.number().int().positive().optional(), replyToId: z.number().int().positive().optional() }).parse(await req.json());
  return NextResponse.json(await postChat(await getDb(), userId, "admin", body, imageId, replyToId), { status: 201 });
});
