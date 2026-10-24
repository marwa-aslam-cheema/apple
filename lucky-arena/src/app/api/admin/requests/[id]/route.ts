import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { route } from "@/lib/api";
import { requireAdminApi } from "@/lib/session";
import { setRequestStatus } from "@/lib/services";
import { requestStatusSchema } from "@/lib/validation";

export const PATCH = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireAdminApi();
  const { status } = requestStatusSchema.parse(await req.json());
  await setRequestStatus(await getDb(), Number((await ctx.params).id), status);
  return NextResponse.json({ ok: true });
});
