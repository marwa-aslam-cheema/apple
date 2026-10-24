import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { rateLimit, route } from "@/lib/api";
import { requireUserApi } from "@/lib/session";
import { spinWheel } from "@/lib/services";

export const POST = route(async () => {
  const user = await requireUserApi();
  rateLimit(`spin:${user.id}`, 60, 60_000);
  return NextResponse.json(await spinWheel(await getDb(), user.id));
});
