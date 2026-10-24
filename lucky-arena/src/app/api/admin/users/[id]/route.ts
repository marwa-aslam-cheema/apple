import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { route } from "@/lib/api";
import { requireAdminApi } from "@/lib/session";
import { AppError, adminAdjust, adminSetPassword } from "@/lib/services";
import { userAdminSchema } from "@/lib/validation";

export const PATCH = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdminApi();
  const id = Number((await ctx.params).id);
  const body = userAdminSchema.parse(await req.json());
  const db = await getDb();
  if (id === admin.id && (body.banned || body.role === "user")) {
    throw new AppError("self_lockout", "You cannot ban or demote yourself.");
  }
  if (body.banned !== undefined || body.role !== undefined) {
    const patch: Partial<typeof users.$inferInsert> = {};
    if (body.banned !== undefined) patch.banned = body.banned;
    if (body.role !== undefined) patch.role = body.role;
    const done = await db.update(users).set(patch).where(eq(users.id, id)).returning({ id: users.id });
    if (!done.length) throw new AppError("not_found", "User not found.", 404);
  }
  if (body.newPassword) await adminSetPassword(db, id, body.newPassword);
  let balance: number | undefined;
  if (body.adjust) balance = await adminAdjust(db, id, body.adjust, body.note ?? "");
  return NextResponse.json({ ok: true, balance });
});
