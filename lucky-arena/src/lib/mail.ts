import { and, eq, ne, notLike } from "drizzle-orm";
import nodemailer from "nodemailer";
import type { Db } from "@/db";
import { users } from "@/db/schema";
import { AppError } from "./services";

// Email goes out either from your own Gmail (GMAIL_USER and GMAIL_APP_PASSWORD) or through Resend (RESEND_API_KEY and MAIL_FROM, needs your own domain).
const gmailOn = () => !!process.env.GMAIL_USER && !!process.env.GMAIL_APP_PASSWORD;
export const mailEnabled = () => gmailOn() || (!!process.env.RESEND_API_KEY && !!process.env.MAIL_FROM);

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Sends one message to each address (each person only sees their own address). Returns how many went out. */
export async function sendMail(to: string[], subject: string, text: string): Promise<number> {
  if (!mailEnabled()) throw new AppError("mail_off", "Email is not switched on yet. Add GMAIL_USER and GMAIL_APP_PASSWORD in Vercel first.", 400);
  const html = `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5;white-space:pre-wrap">${esc(text)}</div>`;
  let sent = 0;
  if (gmailOn()) {
    // From your own Gmail. Each mail goes to 40 people at once in BCC, so nobody sees the others' addresses (Gmail allows about 500 people a day).
    const mailer = nodemailer.createTransport({ service: "gmail", auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD } });
    const from = process.env.MAIL_FROM || `"${(process.env.MAIL_NAME || "Lucky Arena").replace(/"/g, "")}" <${process.env.GMAIL_USER}>`;
    for (let i = 0; i < to.length; i += 40) {
      const chunk = to.slice(i, i + 40);
      try {
        await mailer.sendMail({ from, to: process.env.GMAIL_USER, bcc: chunk, subject, text, html });
      } catch {
        throw new AppError("mail_failed", `Gmail refused the message. Check GMAIL_USER and the 16-letter app password.${sent ? ` ${sent} were already sent.` : ""}`, 502);
      }
      sent += chunk.length;
    }
    return sent;
  }
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

/** Everyone who signed up with an email (not guests, not suspended accounts, not the admin). */
export async function mailAudience(db: Db): Promise<string[]> {
  const rows = await db.select({ email: users.email }).from(users).where(and(ne(users.role, "guest"), ne(users.role, "admin"), eq(users.banned, false), notLike(users.email, "%@guest.invalid")));
  return [...new Set(rows.map((r) => r.email))];
}
