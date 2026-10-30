import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { clientIp, rateLimit, route } from "@/lib/api";
import { getGuestId, setGuestCookie } from "@/lib/session";
import { chatMeta, createGuest, postChat, readChat } from "@/lib/services";

// Support chat for visitors who are not signed in. Nothing is created until they actually write.
export const GET = route(async (req: Request) => {
  const gid = await getGuestId();
  if (!gid) return NextResponse.json({ messages: [], meta: [] });
  const after = Number(new URL(req.url).searchParams.get("after") ?? 0) || 0;
  const db = await getDb();
  return NextResponse.json({ messages: await readChat(db, gid, "user", after), meta: await chatMeta(db, gid, "user") });
});

export const POST = route(async (req: Request) => {
  rateLimit(`guest-chat:${clientIp(req)}`, 20, 60_000);
  const { body } = z.object({ body: z.string().max(5000) }).parse(await req.json());
  const db = await getDb();
  let gid = await getGuestId();
  if (!gid) {
    rateLimit(`guest-new:${clientIp(req)}`, 5, 60 * 60_000);
    gid = await createGuest(db);
    await setGuestCookie(gid);
  }
  return NextResponse.json(await postChat(db, gid, "user", body), { status: 201 });
});
