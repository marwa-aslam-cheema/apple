import { eq } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { users, type User } from "@/db/schema";
import { closeExpiredSessions } from "./game-sessions";
import { AppError } from "./services";

const COOKIE = "la_session";
const MAX_AGE = 60 * 60 * 24 * 7;

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is not set. Generate one with: openssl rand -base64 32");
  }
  return new TextEncoder().encode(s ?? "dev-only-secret-change-me-dev-only-secret");
}

export async function createSession(userId: number) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

/** The signed-in user (fresh from the database), or null. */
export async function getCurrentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const uid = Number(payload.uid);
    if (!Number.isInteger(uid)) return null;
    const db = await getDb();
    await closeExpiredSessions(db, uid); // credits left in a game nobody is playing come back to the wallet
    const [user] = await db.select().from(users).where(eq(users.id, uid));
    if (user && (!user.lastSeenAt || Date.now() - user.lastSeenAt.getTime() > 30_000)) {
      user.lastSeenAt = new Date(); // "online" for the admin: seen within the last couple of minutes
      await db.update(users).set({ lastSeenAt: user.lastSeenAt }).where(eq(users.id, uid));
    }
    return user && !user.banned ? user : null;
  } catch {
    return null;
  }
}

/** For pages: redirect to login when signed out. */
export async function requireUserPage(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdminPage(): Promise<User> {
  const user = await requireUserPage();
  if (user.role !== "admin") redirect("/");
  return user;
}

/** For API routes: throw an AppError that the route wrapper turns into JSON. */
export async function requireUserApi(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new AppError("unauthorized", "Please sign in.", 401);
  return user;
}

export async function requireAdminApi(): Promise<User> {
  const user = await requireUserApi();
  if (user.role !== "admin") throw new AppError("forbidden", "Admins only.", 403);
  return user;
}
