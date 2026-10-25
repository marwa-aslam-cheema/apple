import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { googleEnabled, googleLoginOrCreate, googleProfile } from "@/lib/google";
import { AppError } from "@/lib/services";
import { createSession, readShortToken } from "@/lib/session";
import { cookies } from "next/headers";

/** Step 2: Google sends the visitor back with a code. We check it, sign the player in (or create the account) and carry on. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const base = process.env.SITE_URL ?? url.origin;
  const fail = (code: string) => NextResponse.redirect(new URL(`/login?error=${code}`, base));
  if (!googleEnabled()) return fail("google");
  const jar = await cookies();
  const saved = await readShortToken(jar.get("la_gstate")?.value ?? "");
  const code = url.searchParams.get("code");
  if (!saved || !code || url.searchParams.get("state") !== saved.nonce) return fail("google");
  try {
    const profile = await googleProfile(code, `${base}/api/auth/google/callback`, String(saved.nonce));
    const userId = await googleLoginOrCreate(await getDb(), { email: profile.email, ref: String(saved.ref ?? "") || null });
    await createSession(userId);
  } catch (e) {
    return fail(e instanceof AppError && e.code === "banned" ? "banned" : "google");
  }
  const res = NextResponse.redirect(new URL(String(saved.next || "/"), base));
  res.cookies.delete("la_gstate");
  return res;
}
