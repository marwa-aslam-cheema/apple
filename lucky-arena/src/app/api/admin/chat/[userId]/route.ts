import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { route } from "@/lib/api";
import { requireAdminApi } from "@/lib/session";
import { postChat, readChat } from "@/lib/services";

type Ctx = { params: Promise<{ userId: string }> };

export const GET = route(async (req: Request, ctx: Ctx) => {
  await requireAdminApi();
  const userId = Number((await ctx.params).userId);
  const after = Number(new URL(req.url).searchParams.get("after") ?? 0) || 0;
  return NextResponse.json({ messages: await readChat(await getDb(), userId, "admin", after) });
});

export const POST = route(async (req: Request, ctx: Ctx) => {
  await requireAdminApi();
  const userId = Number((await ctx.params).userId);
  const { body, imageId } = z.object({ body: z.string().max(5000), imageId: z.number().int().positive().optional() }).parse(await req.json());
  return NextResponse.json(await postChat(await getDb(), userId, "admin", body, imageId), { status: 201 });
});
