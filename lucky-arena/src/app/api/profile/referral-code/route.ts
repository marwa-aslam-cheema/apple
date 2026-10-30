import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { rateLimit, route } from "@/lib/api";
import { requireUserApi } from "@/lib/session";
import { setReferralCode } from "@/lib/services";

/** The player changes their own invite code. */
export const PATCH = route(async (req: Request) => {
  const user = await requireUserApi();
  rateLimit(`ref-code:${user.id}`, 10, 60_000);
  const { code } = z.object({ code: z.string().max(12) }).parse(await req.json());
  return NextResponse.json({ ok: true, code: await setReferralCode(await getDb(), user.id, code) });
});
