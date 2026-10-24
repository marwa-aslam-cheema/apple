import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { route } from "@/lib/api";
import { getGuestId } from "@/lib/session";
import { userUnreadCount } from "@/lib/services";

export const GET = route(async () => {
  const gid = await getGuestId();
  return NextResponse.json({ unread: gid ? await userUnreadCount(await getDb(), gid) : 0 });
});
