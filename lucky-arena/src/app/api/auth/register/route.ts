import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { clientIp, rateLimit, route } from "@/lib/api";
import { mailEnabled, startSignupVerification } from "@/lib/mail";
import { createSession } from "@/lib/session";
import { getSite } from "@/lib/site";
import { AppError, registerUser } from "@/lib/services";
import { registerSchema } from "@/lib/validation";

export const POST = route(async (req: Request) => {
  rateLimit(`register:${clientIp(req)}`, 10, 60_000);
  const input = registerSchema.parse(await req.json());
  const db = await getDb();
  if (mailEnabled()) {
    // The email must be real: a code is sent to it, and the account is only created once the code is typed back.
    const email = input.email.trim().toLowerCase();
    const [byEmail] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    if (byEmail) throw new AppError("email_taken", "That email is already registered.", 409);
    const [byName] = await db.select({ id: users.id }).from(users).where(sql`lower(${users.username}) = ${input.username.trim().toLowerCase()}`);
    if (byName) throw new AppError("username_taken", "That username is taken.", 409);
    rateLimit(`register-mail:${email}`, 3, 10 * 60_000);
    const ticket = await startSignupVerification({ email, username: input.username.trim(), passwordHash: await bcrypt.hash(input.password, 10), ref: input.ref ?? null }, (await getSite(db)).name);
    return NextResponse.json({ ok: true, verify: ticket });
  }
  const id = await registerUser(db, input);
  await createSession(id);
  return NextResponse.json({ ok: true });
});
