import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { route } from "@/lib/api";
import { requireUserApi } from "@/lib/session";
import { claimDaily } from "@/lib/services";

export const POST = route(async () => {
  const user = await requireUserApi();
  return NextResponse.json(await claimDaily(await getDb(), user.id));
});
