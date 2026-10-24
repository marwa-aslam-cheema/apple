import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { route } from "@/lib/api";
import { requireAdminApi } from "@/lib/session";
import { grantCreditsAndNotify } from "@/lib/services";

export const POST = route(async (req: Request, ctx: { params: Promise<{ userId: string }> }) => {
  await requireAdminApi();
  const userId = Number((await ctx.params).userId);
  const { amount } = z.object({ amount: z.coerce.number().int().min(1).max(100000) }).parse(await req.json());
  const balance = await grantCreditsAndNotify(await getDb(), userId, amount);
  return NextResponse.json({ ok: true, balance });
});
