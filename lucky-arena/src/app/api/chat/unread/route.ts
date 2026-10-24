import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { route } from "@/lib/api";
import { requireUserApi } from "@/lib/session";
import { adminUnreadCount, userUnreadCount } from "@/lib/services";

export const GET = route(async () => {
  const user = await requireUserApi();
  const db = await getDb();
  const unread = user.role === "admin" ? await adminUnreadCount(db) : await userUnreadCount(db, user.id);
  return NextResponse.json({ unread });
});
