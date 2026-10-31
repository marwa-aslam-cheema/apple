import { and, eq, ne, notLike } from "drizzle-orm";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
import type { Db } from "@/db";
import { settings, users } from "@/db/schema";
import { AppError } from "./services";

// Email goes out from the admin's own Gmail (typed in Admin > Email all, or GMAIL_USER and GMAIL_APP_PASSWORD in Vercel),
// or through Resend (RESEND_API_KEY and MAIL_FROM, needs your own domain).
const KEY_USER = "mail_gmail";
const KEY_PASS = "mail_gmail_password";

function secretKey() {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is not set.");
  return createHash("sha256").update(s ?? "dev-only-secret-change-me-dev-only-secret").digest();
}
// The app password is stored encrypted, never shown again on any page.
function lock(text: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", secretKey(), iv);
  const enc = Buffer.concat([c.update(text, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64")).join(".");
}
function unlock(packed: string): string {
  try {
    const [iv, tag, enc] = packed.split(".").map((x) => Buffer.from(x, "base64"));
    const d = createDecipheriv("aes-256-gcm", secretKey(), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
  } catch {
    return "";
  }
}

async function setting(db: Db, key: string) {
  const [row] = await db.select().from(settings).where(eq(settings.key, key));
  return row?.value ?? "";
}

/** The Gmail the admin typed in (the password stays hidden), and whether email can be sent at all. */
export async function mailConfig(db: Db) {
  const user = (await setting(db, KEY_USER)) || process.env.GMAIL_USER || "";
  const pass = unlock(await setting(db, KEY_PASS)) || process.env.GMAIL_APP_PASSWORD || "";
  const resend = !!process.env.RESEND_API_KEY && !!process.env.MAIL_FROM;
  return { user, pass, gmail: !!user && !!pass, enabled: (!!user && !!pass) || resend };
}

/** Saves the Gmail the messages go out from. An empty password keeps the one already saved. */
export async function saveMailAccount(db: Db, gmail: string, appPassword: string) {
  const rows: [string, string][] = [[KEY_USER, gmail.trim()]];
  const pass = appPassword.replace(/\s+/g, "");
  if (pass) rows.push([KEY_PASS, lock(pass)]);
  for (const [key, value] of rows) await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Sends one message to each address (each person only sees their own address). Returns how many went out. */
export async function sendMail(db: Db, to: string[], subject: string, text: string): Promise<number> {
  const cfg = await mailConfig(db);
  if (!cfg.enabled) throw new AppError("mail_off", "Email is not switched on yet. Type your Gmail and its app password above and save.", 400);
  const html = `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5;white-space:pre-wrap">${esc(text)}</div>`;
  let sent = 0;
  if (cfg.gmail) {
    // From your own Gmail. Each mail goes to 40 people at once in BCC, so nobody sees the others' addresses (Gmail allows about 500 people a day).
    const mailer = nodemailer.createTransport({ service: "gmail", auth: { user: cfg.user, pass: cfg.pass } });
    const from = process.env.MAIL_FROM || `"${(process.env.MAIL_NAME || "Lucky Arena").replace(/"/g, "")}" <${cfg.user}>`;
    for (let i = 0; i < to.length; i += 40) {
      const chunk = to.slice(i, i + 40);
      try {
        await mailer.sendMail({ from, to: cfg.user, bcc: chunk, subject, text, html });
      } catch {
        throw new AppError("mail_failed", `Gmail refused the message. Check the Gmail and its 16-letter app password.${sent ? ` ${sent} were already sent.` : ""}`, 502);
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
