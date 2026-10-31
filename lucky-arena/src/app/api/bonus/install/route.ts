import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { rateLimit, route } from "@/lib/api";
import { requireUserApi } from "@/lib/session";
import { grantAppBonus } from "@/lib/services";

/** The app is installed (opened from the home screen): 2 free spins, once per player. */
export const POST = route(async () => {
  const user = await requireUserApi();
  rateLimit(`install-bonus:${user.id}`, 10, 60_000);
  return NextResponse.json({ ok: true, ...(await grantAppBonus(await getDb(), user.id, "install")) });
});
