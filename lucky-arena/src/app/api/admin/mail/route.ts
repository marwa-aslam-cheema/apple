import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { settings } from "@/db/schema";
import { route } from "@/lib/api";
import { mailAudience, mailConfig, saveMailAccount, sendMail } from "@/lib/mail";
import { requireAdminApi } from "@/lib/session";

export const maxDuration = 60; // seconds: a long list takes a while

const body = z.object({
  subject: z.string().trim().min(1, "Write a subject.").max(120),
  message: z.string().trim().min(1, "Write the message.").max(5000),
  send: z.boolean().optional(),
  gmail: z.string().trim().max(120).refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Type the Gmail address like name@gmail.com").optional(),
  appPassword: z.string().max(60).optional(),
});

/** Saves the message so it can be edited and sent again later; with send=true it goes to every player. */
export const POST = route(async (req: Request) => {
  await requireAdminApi();
  const { subject, message, send, gmail, appPassword } = body.parse(await req.json());
  const db = await getDb();
  for (const [key, value] of [["mail_subject", subject], ["mail_message", message]] as const) {
    await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
  }
  if (gmail !== undefined) await saveMailAccount(db, gmail, appPassword ?? "");
  if (!send) return NextResponse.json({ ok: true, enabled: (await mailConfig(db)).enabled });
  const to = await mailAudience(db);
  const sent = await sendMail(db, to, subject, `${message}\n\n--\nYou get this because you have an account with us.`);
  return NextResponse.json({ ok: true, sent });
});
