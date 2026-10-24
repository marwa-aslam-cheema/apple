import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { route } from "@/lib/api";
import { touchSession } from "@/lib/game-sessions";
import { requireUserApi } from "@/lib/session";

/** The open game page pings this so an abandoned session can expire. */
export const POST = route(async () => {
  const user = await requireUserApi();
  await touchSession(await getDb(), user.id);
  return NextResponse.json({ ok: true });
});
