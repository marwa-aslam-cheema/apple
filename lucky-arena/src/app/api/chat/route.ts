import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { rateLimit, route } from "@/lib/api";
import { requireUserApi } from "@/lib/session";
import { postChat, readChat } from "@/lib/services";

export const GET = route(async (req: Request) => {
  const user = await requireUserApi();
  const after = Number(new URL(req.url).searchParams.get("after") ?? 0) || 0;
  return NextResponse.json({ messages: await readChat(await getDb(), user.id, "user", after) });
});

export const POST = route(async (req: Request) => {
  const user = await requireUserApi();
  rateLimit(`chat:${user.id}`, 20, 60_000);
  const { body } = z.object({ body: z.string().max(5000) }).parse(await req.json());
  return NextResponse.json(await postChat(await getDb(), user.id, "user", body), { status: 201 });
});
