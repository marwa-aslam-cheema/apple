import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { route } from "@/lib/api";
import { requireUserApi } from "@/lib/session";
import { claimPromo } from "@/lib/services";

export const POST = route(async (_req: Request, ctx: { params: Promise<{ code: string }> }) => {
  const user = await requireUserApi();
  const { code } = await ctx.params;
  return NextResponse.json(await claimPromo(await getDb(), user.id, code.toUpperCase()));
});
