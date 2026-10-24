import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createDb, type Db } from "@/db";
import { transactions, users, wheelSegments } from "@/db/schema";
import { REFERRAL_BONUS, SIGNUP_BONUS, SPIN_COST } from "@/lib/config";
import {
  AppError, activeWheel, adminAdjust, claimDaily, claimPromo, lobbyGames, listTransactions,
  adminSetPassword, registerUser, spinWheel, verifyLogin,
} from "@/lib/services";
import { expectedReturn } from "@/lib/wheel";

let db: Db;
beforeAll(async () => {
  // Set TEST_DATABASE_URL (an empty database) to run the same suite against real PostgreSQL.
  const url = process.env.TEST_DATABASE_URL;
  db = await createDb(url ? { url } : { dir: "memory://" });
});

const balanceOf = async (id: number) => (await db.select().from(users).where(eq(users.id, id)))[0].balance;
const code = async (p: Promise<unknown>) => p.then(() => "ok", (e) => (e instanceof AppError ? e.code : String(e)));

describe("seed", () => {
  it("seeds admin, games and a wheel with return below 100%", async () => {
    expect((await lobbyGames(db)).length).toBeGreaterThan(8);
    const segs = await activeWheel(db);
    expect(segs.length).toBeGreaterThanOrEqual(6);
    expect(expectedReturn(segs, SPIN_COST)).toBeLessThan(1);
    const admin = await verifyLogin(db, "admin@luckyarena.test", "admin12345");
    expect(admin.role).toBe("admin");
  });
});

describe("auth", () => {
  it("registers with signup bonus and rejects duplicates and bad logins", async () => {
    const id = await registerUser(db, { email: "A@x.test", username: "alice", password: "password1" });
    expect(await balanceOf(id)).toBe(SIGNUP_BONUS);
    expect(await code(registerUser(db, { email: "a@x.test", username: "other", password: "password1" }))).toBe("email_taken");
    expect(await code(registerUser(db, { email: "b@x.test", username: "ALICE", password: "password1" }))).toBe("username_taken");
    expect((await verifyLogin(db, "alice", "password1")).id).toBe(id);
    expect(await code(verifyLogin(db, "alice", "wrong"))).toBe("bad_credentials");
    expect(await code(verifyLogin(db, "nobody", "x"))).toBe("bad_credentials");
  });
  it("pays a referral bonus to both sides", async () => {
    const a = await registerUser(db, { email: "r1@x.test", username: "refer1", password: "password1" });
    const [{ referralCode }] = await db.select().from(users).where(eq(users.id, a));
    const b = await registerUser(db, { email: "r2@x.test", username: "refer2", password: "password1", ref: referralCode });
    expect(await balanceOf(a)).toBe(SIGNUP_BONUS + REFERRAL_BONUS);
    expect(await balanceOf(b)).toBe(SIGNUP_BONUS + REFERRAL_BONUS);
  });
});

describe("wallet and spin", () => {
  it("debits the cost, credits prizes and keeps the ledger consistent", async () => {
    const id = await registerUser(db, { email: "s@x.test", username: "spinner", password: "password1" });
    for (let i = 0; i < 20; i++) await spinWheel(db, id);
    const rows = await listTransactions(db, id, 500);
    const sum = rows.reduce((t, r) => t + r.amount, 0);
    expect(sum).toBe(await balanceOf(id));
    expect(rows[0].balanceAfter).toBe(await balanceOf(id));
    expect(rows.filter((r) => r.type === "spin_cost")).toHaveLength(20);
  });
  it("refuses to spin without enough credits and never goes negative", async () => {
    const id = await registerUser(db, { email: "p@x.test", username: "poor", password: "password1" });
    await db.update(users).set({ balance: SPIN_COST - 1 }).where(eq(users.id, id));
    expect(await code(spinWheel(db, id))).toBe("insufficient_credits");
    expect(await balanceOf(id)).toBe(SPIN_COST - 1);
  });
  it("handles parallel spins without overspending", async () => {
    const id = await registerUser(db, { email: "c@x.test", username: "concurrent", password: "password1" });
    await db.update(users).set({ balance: SPIN_COST * 2 }).where(eq(users.id, id));
    await db.update(wheelSegments).set({ credits: 0 }); // prizes off so the arithmetic is exact
    const results = await Promise.all([1, 2, 3, 4].map(() => code(spinWheel(db, id))));
    expect(results.filter((r) => r === "ok")).toHaveLength(2);
    expect(await balanceOf(id)).toBe(0);
  });
  it("limits the daily bonus by cooldown", async () => {
    const id = await registerUser(db, { email: "d@x.test", username: "daily", password: "password1" });
    const now = new Date("2026-01-01T10:00:00Z");
    expect((await claimDaily(db, id, now)).reward).toBe(100);
    expect(await code(claimDaily(db, id, new Date(now.getTime() + 3600_000)))).toBe("cooldown");
    expect(await code(claimDaily(db, id, new Date(now.getTime() + 21 * 3600_000)))).toBe("ok");
  });
  it("lets a promotion be claimed only once", async () => {
    const id = await registerUser(db, { email: "pr@x.test", username: "promo", password: "password1" });
    expect((await claimPromo(db, id, "WELCOME500")).reward).toBe(500);
    expect(await code(claimPromo(db, id, "WELCOME500"))).toBe("already_claimed");
    expect(await code(claimPromo(db, id, "FRIENDS"))).toBe("not_claimable");
    expect(await code(claimPromo(db, id, "NOPE"))).toBe("not_found");
  });
  it("supports admin adjustments but not below zero", async () => {
    const id = await registerUser(db, { email: "ad@x.test", username: "adjusted", password: "password1" });
    await adminAdjust(db, id, 250, "gift");
    expect(await balanceOf(id)).toBe(SIGNUP_BONUS + 250);
    expect(await code(adminAdjust(db, id, -999999, "x"))).toBe("insufficient_credits");
    expect(await code(adminAdjust(db, id, 0, "x"))).toBe("bad_amount");
    const t = await db.select().from(transactions).where(eq(transactions.userId, id));
    expect(t.map((r) => r.type)).toContain("admin_adjust");
  });
});

describe("password reset by admin", () => {
  it("lets the user log in with the new password only", async () => {
    const id = await registerUser(db, { email: "pw@x.test", username: "forgetful", password: "oldpassword1" });
    await adminSetPassword(db, id, "newpassword1");
    expect(await code(verifyLogin(db, "forgetful", "oldpassword1"))).toBe("bad_credentials");
    expect((await verifyLogin(db, "forgetful", "newpassword1")).id).toBe(id);
    expect(await code(adminSetPassword(db, 999999, "newpassword1"))).toBe("not_found");
  });
});

describe("lobby", () => {
  it("searches and filters by category", async () => {
    const wheel = await lobbyGames(db, { category: "Wheel" });
    expect(wheel.every((g) => g.category === "Wheel")).toBe(true);
    const found = await lobbyGames(db, { q: "quest" });
    expect(found.map((g) => g.slug)).toContain("card-quest");
    expect((await lobbyGames(db, { q: "zzzz" })).length).toBe(0);
  });
});
