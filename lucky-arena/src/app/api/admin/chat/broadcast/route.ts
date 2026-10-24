import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { rateLimit, route } from "@/lib/api";
import { requireAdminApi } from "@/lib/session";
import { broadcastChat, broadcastRecipientCount } from "@/lib/services";

/** How many players a message sent to all would reach (shown before the admin confirms). */
export const GET = route(async () => {
  await requireAdminApi();
  return NextResponse.json({ recipients: await broadcastRecipientCount(await getDb()) });
});

export const POST = route(async (req: Request) => {
  const admin = await requireAdminApi();
  rateLimit(`broadcast:${admin.id}`, 20, 60 * 60_000);
  const { body } = z.object({ body: z.string().max(5000) }).parse(await req.json());
  return NextResponse.json({ sent: await broadcastChat(await getDb(), body) });
});
