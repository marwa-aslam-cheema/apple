import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { rateLimit, route } from "@/lib/api";
import { requireUserApi } from "@/lib/session";
import { claimWelcomeBonus } from "@/lib/services";

export const POST = route(async () => {
  const user = await requireUserApi();
  rateLimit(`welcome-bonus:${user.id}`, 10, 60_000);
  return NextResponse.json({ ok: true, ...(await claimWelcomeBonus(await getDb(), user.id)) });
});
