import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { AppError } from "@/lib/services";
import { route } from "@/lib/api";
import { requireAdminApi } from "@/lib/session";
import { resourceFor, assertWheelPlayable, parsePatch } from "@/lib/admin";

type Ctx = { params: Promise<{ resource: string; id: string }> };

export const PATCH = route(async (req: Request, ctx: Ctx) => {
  await requireAdminApi();
  const { resource, id } = await ctx.params;
  const r = resourceFor(resource);
  const body = await req.json();
  const db = await getDb();
  const row = await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(r.table).where(eq(r.table.id, Number(id)));
    if (!existing) throw new AppError("not_found", "Not found.", 404);
    const data = parsePatch(r.schema, existing, body);
    const [updated] = await tx.update(r.table).set(data as never).where(eq(r.table.id, Number(id))).returning();
    if (!updated) throw new AppError("not_found", "Not found.", 404);
    if (resource === "wheel") await assertWheelPlayable(tx as never);
    return updated;
  });
  return NextResponse.json(row);
});

export const DELETE = route(async (_req: Request, ctx: Ctx) => {
  await requireAdminApi();
  const { resource, id } = await ctx.params;
  const r = resourceFor(resource);
  const db = await getDb();
  await db.transaction(async (tx) => {
    const deleted = await tx.delete(r.table).where(eq(r.table.id, Number(id))).returning({ id: r.table.id });
    if (!deleted.length) throw new AppError("not_found", "Not found.", 404);
    if (resource === "wheel") await assertWheelPlayable(tx as never);
  });
  return NextResponse.json({ ok: true });
});
