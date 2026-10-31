import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Db } from "@/db";
import { users } from "@/db/schema";
import { getTexts } from "./texts";
import { AppError, registerUser } from "./services";

// "Continue with Google". Switched on by GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET; without them the button is hidden.
export const googleEnabled = () => !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

export function googleAuthUrl(p: { redirectUri: string; state: string; nonce: string }): string {
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID ?? "");
  u.searchParams.set("redirect_uri", p.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", "openid email profile");
  u.searchParams.set("state", p.state);
  u.searchParams.set("nonce", p.nonce);
  u.searchParams.set("prompt", "select_account");
  return u.toString();
}

const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

/** Trades the code Google sent back for the signed ID token and checks it (signature, issuer, audience, nonce, verified email). */
export async function googleProfile(code: string, redirectUri: string, nonce: string): Promise<{ email: string; name: string }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID ?? "", client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "", redirect_uri: redirectUri, grant_type: "authorization_code" }),
  });
  const data = (await res.json()) as { id_token?: string };
  if (!res.ok || !data.id_token) throw new AppError("google_failed", "Google sign-in failed. Please try again.", 400);
  const { payload } = await jwtVerify(data.id_token, JWKS, { issuer: ["https://accounts.google.com", "accounts.google.com"], audience: process.env.GOOGLE_CLIENT_ID });
  if (payload.nonce !== nonce) throw new AppError("google_failed", "Google sign-in failed. Please try again.", 400);
  if (payload.email_verified !== true || typeof payload.email !== "string") throw new AppError("google_unverified", "Your Google email is not verified.", 400);
  return { email: payload.email.toLowerCase(), name: typeof payload.name === "string" ? payload.name : "" };
}

/** A username from the part of the email before the @: letters, numbers and underscore, 3 to 20 characters. */
export function baseUsername(email: string): string {
  const clean = email.split("@")[0].replace(/[^A-Za-z0-9_]/g, "").slice(0, 14);
  return clean.length >= 3 ? clean : `player${clean}`.slice(0, 14);
}

export async function uniqueUsername(db: Db, email: string): Promise<string> {
  const base = baseUsername(email);
  for (let i = 0; i < 8; i++) {
    const candidate = i === 0 ? base : `${base}${randomBytes(2).toString("hex")}`.slice(0, 20);
    const [hit] = await db.select({ id: users.id }).from(users).where(sql`lower(${users.username}) = ${candidate.toLowerCase()}`);
    if (!hit) return candidate;
  }
  return `player${randomBytes(5).toString("hex")}`;
}

/**
 * Signs in the player with this verified email, or creates the account (with the same welcome spins and referral
 * bonus as a normal sign-up). The password is random and unknown: the admin can set one from the chat if it is ever needed.
 */
export async function googleLoginOrCreate(db: Db, p: { email: string; ref?: string | null }) {
  const [existing] = await db.select().from(users).where(eq(users.email, p.email));
  if (existing) {
    if (existing.banned) throw new AppError("banned", "This account is suspended.", 403);
    return existing.id;
  }
  const id = await registerUser(db, { email: p.email, username: await uniqueUsername(db, p.email), password: randomBytes(24).toString("base64url"), ref: p.ref });
  const bonus = (await getTexts(db)).googleBonus;
  if (bonus > 0) await db.update(users).set({ welcomeBonus: bonus }).where(eq(users.id, id)); // the player taps "Claim" in the welcome popup
  return id;
}
