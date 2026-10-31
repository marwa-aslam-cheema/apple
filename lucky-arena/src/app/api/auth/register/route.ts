import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { clientIp, rateLimit, route } from "@/lib/api";
import { googleEnabled } from "@/lib/google";
import { createSession } from "@/lib/session";
import { AppError, postChat, registerUser } from "@/lib/services";
import { getTexts } from "@/lib/texts";
import { registerSchema } from "@/lib/validation";

const GMAIL = /@(gmail|googlemail)\.com$/i;

export const POST = route(async (req: Request) => {
  rateLimit(`register:${clientIp(req)}`, 10, 60_000);
  const input = registerSchema.parse(await req.json());
  // A Gmail address must be proven real, and only Google can prove it. Other emails (Apple ID and so on) just make an account.
  if (googleEnabled() && GMAIL.test(input.email.trim())) throw new AppError("gmail_needs_google", "For a Gmail address please tap \"Continue with Google\". It checks the Gmail is real.", 403);
  const db = await getDb();
  const id = await registerUser(db, input);
  await postChat(db, id, "user", (await getTexts(db)).msgSignup); // the admin sees it in the chat
  await createSession(id);
  return NextResponse.json({ ok: true });
});
