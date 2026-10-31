import { createHmac, randomInt } from "node:crypto";
import { and, eq, ne, notLike } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import type { Db } from "@/db";
import { users } from "@/db/schema";
import { AppError } from "./services";

// Email goes out through Resend (resend.com). Switched on by RESEND_API_KEY and MAIL_FROM (for example "Lucky Arena <hello@myclub.com>").
export const mailEnabled = () => !!process.env.RESEND_API_KEY && !!process.env.MAIL_FROM;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Sends one message to each address (each person only sees their own address). Returns how many went out. */
export async function sendMail(to: string[], subject: string, text: string): Promise<number> {
  if (!mailEnabled()) throw new AppError("mail_off", "Email is not switched on yet. Add RESEND_API_KEY and MAIL_FROM in Vercel first.", 400);
  const html = `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5;white-space:pre-wrap">${esc(text)}</div>`;
  let sent = 0;
  for (let i = 0; i < to.length; i += 100) {
    const chunk = to.slice(i, i + 100);
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(chunk.map((email) => ({ from: process.env.MAIL_FROM, to: [email], subject, text, html }))),
    });
    if (!res.ok) throw new AppError("mail_failed", `The email service refused the message (${res.status}). Check the key and the sender address.${sent ? ` ${sent} were already sent.` : ""}`, 502);
    sent += chunk.length;
  }
  return sent;
}

function key(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is not set.");
  return new TextEncoder().encode(s ?? "dev-only-secret-change-me-dev-only-secret");
}
const codeHash = (code: string, email: string) => createHmac("sha256", key()).update(`${email}:${code}`).digest("hex");

export interface PendingSignup { email: string; username: string; passwordHash: string; ref: string | null }

/** Emails a 6-digit code and returns a signed, 15-minute ticket holding the sign-up (nothing is saved until the code is right). */
export async function startSignupVerification(p: PendingSignup, siteName: string): Promise<string> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await sendMail([p.email], `${code} is your ${siteName} code`, `Your ${siteName} code is ${code}\n\nType it on the sign-up page to finish creating your account. It works for 15 minutes.\nIf you did not ask for this, just ignore this email.`);
  return new SignJWT({ ...p, h: codeHash(code, p.email) }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("15m").sign(key());
}

export async function finishSignupVerification(ticket: string, code: string): Promise<PendingSignup> {
  let p: PendingSignup & { h: string };
  try {
    p = (await jwtVerify(ticket, key())).payload as unknown as PendingSignup & { h: string };
  } catch {
    throw new AppError("code_expired", "That code has expired. Please sign up again.", 400);
  }
  if (p.h !== codeHash(code.trim(), p.email)) throw new AppError("code_wrong", "That code is not right. Check your email and try again.", 400);
  return { email: p.email, username: p.username, passwordHash: p.passwordHash, ref: p.ref };
}

/** Everyone who signed up with an email (not guests, not suspended accounts, not the admin). */
export async function mailAudience(db: Db): Promise<string[]> {
  const rows = await db.select({ email: users.email }).from(users).where(and(ne(users.role, "guest"), ne(users.role, "admin"), eq(users.banned, false), notLike(users.email, "%@guest.invalid")));
  return [...new Set(rows.map((r) => r.email))];
}
