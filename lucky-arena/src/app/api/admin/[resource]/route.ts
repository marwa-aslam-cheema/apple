import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { route } from "@/lib/api";
import { requireAdminApi } from "@/lib/session";
import { resourceFor, assertWheelPlayable } from "@/lib/admin";

export const POST = route(async (req: Request, ctx: { params: Promise<{ resource: string }> }) => {
  await requireAdminApi();
  const { resource } = await ctx.params;
  const r = resourceFor(resource);
  const data = r.schema.parse(await req.json());
  const db = await getDb();
  const row = await db.transaction(async (tx) => {
    const [created] = await tx.insert(r.table).values(data as never).returning();
    if (resource === "wheel") await assertWheelPlayable(tx as never);
    return created;
  });
  return NextResponse.json(row, { status: 201 });
});
