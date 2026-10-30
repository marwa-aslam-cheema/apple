import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { clientIp, rateLimit, route } from "@/lib/api";
import { getGuestId, setGuestCookie } from "@/lib/session";
import { createGuest, createResetRequest, postChat } from "@/lib/services";
import { forgotSchema } from "@/lib/validation";

export const POST = route(async (req: Request) => {
  rateLimit(`forgot:${clientIp(req)}`, 5, 60_000);
  const { identifier } = forgotSchema.parse(await req.json());
  const db = await getDb();
  await createResetRequest(db, identifier);
  // The admin also gets a chat message, and the visitor sees the same chat while signed out.
  let gid = await getGuestId();
  if (!gid) {
    gid = await createGuest(db, `reset: ${identifier.trim().slice(0, 40)}`);
    await setGuestCookie(gid);
  } else {
    await db.update(users).set({ tag: `reset: ${identifier.trim().slice(0, 40)}` }).where(eq(users.id, gid));
  }
  await postChat(db, gid, "user", `Password reset request. My email or username: ${identifier.trim()}`);
  // Same answer whether or not the account exists.
  return NextResponse.json({ ok: true });
});
