import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { clientIp, rateLimit, route } from "@/lib/api";
import { googleEnabled } from "@/lib/google";
import { createSession } from "@/lib/session";
import { AppError, registerUser } from "@/lib/services";
import { registerSchema } from "@/lib/validation";

const GMAIL = /@(gmail|googlemail)\.com$/i;

export const POST = route(async (req: Request) => {
  rateLimit(`register:${clientIp(req)}`, 10, 60_000);
  const input = registerSchema.parse(await req.json());
  // A Gmail address must be proven real, and only Google can prove it. Other emails (Apple ID and so on) just make an account.
  if (googleEnabled() && GMAIL.test(input.email.trim())) throw new AppError("gmail_needs_google", "For a Gmail address please tap \"Continue with Google\". It checks the Gmail is real.", 403);
  const id = await registerUser(await getDb(), input);
  await createSession(id);
  return NextResponse.json({ ok: true });
});
