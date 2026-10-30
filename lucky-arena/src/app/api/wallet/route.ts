import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { route } from "@/lib/api";
import { requireUserApi } from "@/lib/session";
import { listTransactions } from "@/lib/services";

export const GET = route(async () => {
  const user = await requireUserApi();
  const transactions = await listTransactions(await getDb(), user.id, 100);
  return NextResponse.json({ balance: user.balance, xp: user.xp, transactions });
});
