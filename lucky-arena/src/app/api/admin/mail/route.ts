import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { settings } from "@/db/schema";
import { route } from "@/lib/api";
import { mailAudience, mailEnabled, sendMail } from "@/lib/mail";
import { requireAdminApi } from "@/lib/session";

const body = z.object({
  subject: z.string().trim().min(1, "Write a subject.").max(120),
  message: z.string().trim().min(1, "Write the message.").max(5000),
  send: z.boolean().optional(),
});

/** Saves the message so it can be edited and sent again later; with send=true it goes to every player. */
export const POST = route(async (req: Request) => {
  await requireAdminApi();
  const { subject, message, send } = body.parse(await req.json());
  const db = await getDb();
  for (const [key, value] of [["mail_subject", subject], ["mail_message", message]] as const) {
    await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
  }
  if (!send) return NextResponse.json({ ok: true });
  const to = await mailAudience(db);
  if (!mailEnabled()) return NextResponse.json({ error: "Email is not switched on yet. Add RESEND_API_KEY and MAIL_FROM in Vercel first." }, { status: 400 });
  const sent = await sendMail(to, subject, `${message}\n\n--\nYou get this because you have an account with us.`);
  return NextResponse.json({ ok: true, sent });
});
