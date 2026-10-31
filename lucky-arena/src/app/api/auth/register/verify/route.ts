import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { clientIp, rateLimit, route } from "@/lib/api";
import { finishSignupVerification } from "@/lib/mail";
import { createSession } from "@/lib/session";
import { registerUser } from "@/lib/services";

const body = z.object({ ticket: z.string().max(2000), code: z.string().trim().regex(/^\d{6}$/, "The code has 6 numbers.") });

export const POST = route(async (req: Request) => {
  rateLimit(`verify:${clientIp(req)}`, 10, 60_000);
  const { ticket, code } = body.parse(await req.json());
  const p = await finishSignupVerification(ticket, code);
  const id = await registerUser(await getDb(), { email: p.email, username: p.username, passwordHash: p.passwordHash, ref: p.ref });
  await createSession(id);
  return NextResponse.json({ ok: true });
});
