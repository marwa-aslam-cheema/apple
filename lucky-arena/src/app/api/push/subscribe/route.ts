import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { rateLimit, route } from "@/lib/api";
import { requireUserApi } from "@/lib/session";

const sub = z.object({ endpoint: z.string().url().max(600), keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }) });

export const POST = route(async (req: Request) => {
  const user = await requireUserApi();
  rateLimit(`push:${user.id}`, 20, 60_000);
  const s = sub.parse(await req.json());
  const db = await getDb();
  // The same phone can belong to a different player later (shared device): the newest login owns it.
  await db.insert(pushSubscriptions).values({ userId: user.id, endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId: user.id, p256dh: s.keys.p256dh, auth: s.keys.auth } });
  return NextResponse.json({ ok: true });
});

export const DELETE = route(async (req: Request) => {
  await requireUserApi();
  const { endpoint } = z.object({ endpoint: z.string().max(600) }).parse(await req.json());
  await (await getDb()).delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  return NextResponse.json({ ok: true });
});
