import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/api";
import { googleAuthUrl, googleEnabled } from "@/lib/google";
import { safeNext } from "@/lib/safe-next";
import { signShortToken } from "@/lib/session";

/** Step 1 of "Continue with Google": send the visitor to Google, remembering where they were going. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const base = process.env.SITE_URL ?? url.origin;
  if (!googleEnabled()) return NextResponse.redirect(new URL("/login", base));
  try {
    rateLimit(`google-start:${clientIp(req)}`, 20, 60_000);
  } catch {
    return NextResponse.redirect(new URL("/login?error=slow", base));
  }
  const nonce = randomBytes(16).toString("hex");
  const ref = (url.searchParams.get("ref") ?? "").toUpperCase();
  const token = await signShortToken({ nonce, next: safeNext(url.searchParams.get("next") ?? undefined) ?? "", ref: /^[A-Z0-9]{4,12}$/.test(ref) ? ref : "" });
  const res = NextResponse.redirect(googleAuthUrl({ redirectUri: `${base}/api/auth/google/callback`, state: nonce, nonce }));
  res.cookies.set("la_gstate", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false", path: "/", maxAge: 600 });
  return res;
}
