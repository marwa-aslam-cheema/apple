import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { clientIp, rateLimit, route } from "@/lib/api";
import { createResetRequest } from "@/lib/services";
import { forgotSchema } from "@/lib/validation";

export const POST = route(async (req: Request) => {
  rateLimit(`forgot:${clientIp(req)}`, 5, 60_000);
  const { identifier } = forgotSchema.parse(await req.json());
  await createResetRequest(await getDb(), identifier);
  // Same answer whether or not the account exists.
  return NextResponse.json({ ok: true });
});
