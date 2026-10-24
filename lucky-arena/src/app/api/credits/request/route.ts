import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { rateLimit, route } from "@/lib/api";
import { requireUserApi } from "@/lib/session";
import { postChat } from "@/lib/services";

/** The player asks the admin for credits: it simply lands in their support chat as a message. */
export const POST = route(async () => {
  const user = await requireUserApi();
  rateLimit(`credit-request:${user.id}`, 5, 60 * 60_000);
  await postChat(await getDb(), user.id, "user", "I want credits");
  return NextResponse.json({ ok: true });
});
