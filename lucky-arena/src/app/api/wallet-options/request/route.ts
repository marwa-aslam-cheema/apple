import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { rateLimit, route } from "@/lib/api";
import { requireUserApi } from "@/lib/session";
import { requestWalletOption } from "@/lib/services";

export const POST = route(async (req: Request) => {
  const user = await requireUserApi();
  rateLimit(`wallet-option:${user.id}`, 30, 60 * 60_000);
  const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(await req.json());
  return NextResponse.json({ ok: true, ...(await requestWalletOption(await getDb(), user.id, id)) });
});
