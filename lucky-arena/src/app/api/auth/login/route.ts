import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { clientIp, rateLimit, route } from "@/lib/api";
import { createSession } from "@/lib/session";
import { verifyLogin } from "@/lib/services";
import { loginSchema } from "@/lib/validation";

export const POST = route(async (req: Request) => {
  rateLimit(`login:${clientIp(req)}`, 15, 60_000);
  const { identifier, password } = loginSchema.parse(await req.json());
  const user = await verifyLogin(await getDb(), identifier, password);
  await createSession(user.id);
  return NextResponse.json({ ok: true, role: user.role });
});
