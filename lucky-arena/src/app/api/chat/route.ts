import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { rateLimit, route } from "@/lib/api";
import { requireUserApi } from "@/lib/session";
import { chatMeta, postChat, readChat } from "@/lib/services";

export const GET = route(async (req: Request) => {
  const user = await requireUserApi();
  const after = Number(new URL(req.url).searchParams.get("after") ?? 0) || 0;
  const db = await getDb();
  return NextResponse.json({ messages: await readChat(db, user.id, "user", after), meta: await chatMeta(db, user.id, "user") });
});

export const POST = route(async (req: Request) => {
  const user = await requireUserApi();
  rateLimit(`chat:${user.id}`, 20, 60_000);
  const { body, imageId, replyToId } = z.object({ body: z.string().max(5000), imageId: z.number().int().positive().optional(), replyToId: z.number().int().positive().optional() }).parse(await req.json());
  return NextResponse.json(await postChat(await getDb(), user.id, "user", body, imageId, replyToId), { status: 201 });
});
