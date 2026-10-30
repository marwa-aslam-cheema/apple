import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { clientIp, rateLimit, route } from "@/lib/api";
import { createSession } from "@/lib/session";
import { registerUser } from "@/lib/services";
import { registerSchema } from "@/lib/validation";

export const POST = route(async (req: Request) => {
  rateLimit(`register:${clientIp(req)}`, 10, 60_000);
  const input = registerSchema.parse(await req.json());
  const id = await registerUser(await getDb(), input);
  await createSession(id);
  return NextResponse.json({ ok: true });
});
