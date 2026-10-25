import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createDb, type Db } from "@/db";
import { gameSessions, games, spins, walletOptions, transactions, users, wheelSegments } from "@/db/schema";
import { REFERRAL_BONUS, SIGNUP_BONUS, SPIN_COST } from "@/lib/config";
import {
  AppError, activeWheel, adminAdjust, claimDaily, claimPromo, lobbyGames, listTransactions,
  adminSetPassword, requestCredits, userHistory, broadcastChat, broadcastRecipientCount, grantCreditsAndNotify, adminUnreadCount, createGuest, chatMeta, deleteChatMessage, reactChatMessage, requestGameAccount, requestWalletOption, saveChatImage, readChatImage, userUnreadCount, chatConversations, createResetRequest, postChat, readChat, setRequestStatus, registerUser, spinWheel, verifyLogin,
} from "@/lib/services";
import { maskName, recentWins } from "@/lib/promo";
import { fillCaption } from "@/lib/site";
import { joinTags, tagList } from "@/lib/tags";
import { safeNext } from "@/lib/safe-next";
import { socialSchema } from "@/lib/validation";
import { expectedReturn } from "@/lib/wheel";
import { absorbWallet, apiReport, apiSession, apiSettle, buildLaunchUrl, closeExpiredSessions, enterGame, exitGame, getOpenSession, listGameAccounts, regenerateApiKey, removeGameAccount, setGameAccount } from "@/lib/game-sessions";

let db: Db;
beforeAll(async () => {
  // Set TEST_DATABASE_URL (an empty database) to run the same suite against real PostgreSQL.
  const url = process.env.TEST_DATABASE_URL;
  db = await createDb(url ? { url } : { dir: "memory://" });
});

const balanceOf = async (id: number) => (await db.select().from(users).where(eq(users.id, id)))[0].balance;
const totalOf = async (id: number) => (await balanceOf(id)) + ((await getOpenSession(db, id))?.balance ?? 0); // wallet + inside the open game
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

describe("welcome wheel", () => {
  it("starts new players at zero with exactly two free small-prize spins", async () => {
    const id = await registerUser(db, { email: "new@x.test", username: "newcomer", password: "password1" });
    expect(await balanceOf(id)).toBe(0);
    const first = await spinWheel(db, id);
    const second = await spinWheel(db, id);
    expect([first, second].every((r) => r.welcome && r.cost === 0 && [0, 1, 2].includes(r.prize))).toBe(true);
    expect(second.welcomeLeft).toBe(0);
    expect(await balanceOf(id)).toBe(first.prize + second.prize);
    expect(first.prize + second.prize).toBeLessThanOrEqual(4);
    // After the welcome spins the paid wheel applies, and an empty wallet cannot spin it.
    if (first.prize + second.prize < SPIN_COST) expect(await code(spinWheel(db, id))).toBe("insufficient_credits");
  });
  it("never lets parallel requests use more than the free spins", async () => {
    const id = await registerUser(db, { email: "par@x.test", username: "parallel", password: "password1" });
    const results = await Promise.all([1, 2, 3, 4, 5].map(() => spinWheel(db, id).then((r) => r.welcome, () => "failed")));
    expect(results.filter((r) => r === true)).toHaveLength(2);
  });
  it("keeps every welcome prize tiny", async () => {
    const segs = await activeWheel(db, "welcome");
    expect(segs.length).toBeGreaterThanOrEqual(3);
    expect(Math.max(...segs.map((x) => x.credits))).toBeLessThanOrEqual(2);
  });
});

describe("wallet and spin", () => {
  it("moves credits into the game, plays from there and keeps the ledger consistent", async () => {
    const id = await registerUser(db, { email: "s@x.test", username: "spinner", password: "password1" });
    await db.update(users).set({ welcomeSpins: 0 }).where(eq(users.id, id));
    await adminAdjust(db, id, 5000, "test funds");
    for (let i = 0; i < 20; i++) await spinWheel(db, id);
    const played = await db.select().from(spins).where(eq(spins.userId, id));
    expect(played).toHaveLength(20);
    const net = played.reduce((t, r) => t + r.prize - r.cost, 0);
    expect(await balanceOf(id)).toBe(0); // everything is in the game
    expect(await totalOf(id)).toBe(5000 + net);
    const back = await exitGame(db, id);
    expect(back?.returned).toBe(5000 + net); // leaving brings it home
    expect(await balanceOf(id)).toBe(5000 + net);
    const rows = await listTransactions(db, id, 500);
    expect(rows.reduce((t, r) => t + r.amount, 0)).toBe(await balanceOf(id)); // the wallet ledger still adds up
    expect(rows.map((r) => r.type)).toEqual(expect.arrayContaining(["game_stake", "game_return"]));
  });
  it("refuses to spin without enough credits and never goes negative", async () => {
    const id = await registerUser(db, { email: "p@x.test", username: "poor", password: "password1" });
    await db.update(users).set({ balance: SPIN_COST - 1, welcomeSpins: 0 }).where(eq(users.id, id));
    expect(await code(spinWheel(db, id))).toBe("insufficient_credits");
    expect(await balanceOf(id)).toBe(SPIN_COST - 1);
  });
  it("handles parallel spins without overspending", async () => {
    const id = await registerUser(db, { email: "c@x.test", username: "concurrent", password: "password1" });
    await db.update(users).set({ balance: SPIN_COST * 2, welcomeSpins: 0 }).where(eq(users.id, id));
    await db.update(wheelSegments).set({ credits: 0 }).where(eq(wheelSegments.kind, "main")); // prizes off so the arithmetic is exact
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

describe("forgot password requests", () => {
  it("records one open request per account and never reveals unknown accounts", async () => {
    const { supportRequests } = await import("@/db/schema");
    const id = await registerUser(db, { email: "fg@x.test", username: "forgot1", password: "password1" });
    await createResetRequest(db, "FG@x.test");
    await createResetRequest(db, "forgot1");
    await createResetRequest(db, "nobody-here");
    const rows = await db.select().from(supportRequests);
    const mine = rows.filter((r) => r.userId === id);
    expect(mine).toHaveLength(1);
    expect(rows.some((r) => r.userId === null && r.identifier === "nobody-here")).toBe(true);
    await setRequestStatus(db, mine[0].id, "done");
    expect(await code(setRequestStatus(db, 999999, "done"))).toBe("not_found");
  });
});

describe("support chat", () => {
  it("keeps one thread per player with read tracking", async () => {
    const a = await registerUser(db, { email: "c1@x.test", username: "chatter1", password: "password1" });
    const b = await registerUser(db, { email: "c2@x.test", username: "chatter2", password: "password1" });
    const before = await adminUnreadCount(db);
    await postChat(db, a, "user", "  hello admin  ");
    await postChat(db, b, "user", "me too");
    expect(await adminUnreadCount(db)).toBe(before + 2);
    const convos = await chatConversations(db);
    expect(convos[0].username).toBe("chatter2"); // newest first
    expect(convos.find((c) => c.userId === a)?.unread).toBe(1);

    const thread = await readChat(db, a, "admin");
    expect(thread.map((m) => m.body)).toEqual(["hello admin"]); // trimmed
    expect(await adminUnreadCount(db)).toBe(before + 1);

    await postChat(db, a, "admin", "hi, how can I help?");
    expect(await userUnreadCount(db, a)).toBe(1);
    expect((await readChat(db, a, "user")).map((m) => m.sender)).toEqual(["user", "admin"]);
    const later = await readChat(db, a, "user", thread[0].id);
    expect(later.map((m) => m.body)).toEqual(["hi, how can I help?"]); // only newer than `after`
    expect(await userUnreadCount(db, a)).toBe(0); // already read above
    expect((await readChat(db, b, "user")).every((m) => m.body !== "hi, how can I help?")).toBe(true); // no leakage
  });
  it("lists online players, unread first, with their tag", async () => {
    const quiet = await registerUser(db, { email: "on1@x.test", username: "online_quiet", password: "password1" });
    const writer = await registerUser(db, { email: "on2@x.test", username: "unread_writer", password: "password1" });
    await db.update(users).set({ lastSeenAt: new Date(), tag: "ludo: ali99" }).where(eq(users.id, quiet));
    await db.update(users).set({ lastSeenAt: new Date(Date.now() - 10 * 60_000) }).where(eq(users.id, writer));
    await postChat(db, writer, "user", "need help");
    const list = await chatConversations(db);
    expect(list[0]).toMatchObject({ username: "unread_writer", unread: 1, online: false }); // unread comes first
    expect(list.find((c) => c.userId === quiet)).toMatchObject({ online: true, tag: "ludo: ali99", unread: 0 }); // online without writing
  });
  it("lets a signed-out visitor chat through a guest thread that broadcasts skip", async () => {
    const gid = await createGuest(db, "reset: someone");
    await postChat(db, gid, "user", "Password reset request. My email or username: someone");
    const row = (await chatConversations(db)).find((c) => c.userId === gid);
    expect(row).toMatchObject({ unread: 1, tag: "reset: someone" });
    await postChat(db, gid, "admin", "Done, check your email");
    expect((await readChat(db, gid, "user")).map((m) => m.sender)).toEqual(["user", "admin"]);
    expect(await verifyLogin(db, `guest-x`, "!").catch((e) => e.code)).toBeTruthy(); // a guest can never log in
    const n = await broadcastRecipientCount(db);
    await broadcastChat(db, "hello everyone");
    expect((await readChat(db, gid, "user")).some((m) => m.body === "hello everyone")).toBe(false);
    expect(n).toBeGreaterThan(0);
  });
  it("rejects empty and oversized messages", async () => {
    const id = await registerUser(db, { email: "c3@x.test", username: "chatter3", password: "password1" });
    expect(await code(postChat(db, id, "user", "   "))).toBe("invalid");
    expect(await code(postChat(db, id, "user", "x".repeat(1001)))).toBe("invalid");
  });
});

describe("credit requests", () => {
  it("admin adds credits and the player is told in chat", async () => {
    const id = await registerUser(db, { email: "cr@x.test", username: "requester", password: "password1" });
    await postChat(db, id, "user", "I need a top-up");
    const balance = await grantCreditsAndNotify(db, id, 500);
    expect(balance).toBe(500);
    expect(await balanceOf(id)).toBe(500);
    const thread = await readChat(db, id, "user");
    expect(thread.map((m) => m.body)).toEqual(["I need a top-up", "Added 500 credits to your wallet. Balance: 500."]);
    const tx = await listTransactions(db, id, 5);
    expect(tx[0]).toMatchObject({ type: "admin_adjust", amount: 500 });
  });
  it("rejects bad amounts and unknown players without leaving a message", async () => {
    const id = await registerUser(db, { email: "cr2@x.test", username: "requester2", password: "password1" });
    for (const bad of [0, -5, 1.5, 100001]) expect(await code(grantCreditsAndNotify(db, id, bad))).toBe("bad_amount");
    expect(await code(grantCreditsAndNotify(db, 999999, 10))).toBe("not_found");
    expect(await readChat(db, id, "user")).toHaveLength(0);
  });
});

describe("send to all", () => {
  it("reaches every active player but not admins or banned accounts, and stays out of the conversation list", async () => {
    const a = await registerUser(db, { email: "b1@x.test", username: "bcast1", password: "password1" });
    const b = await registerUser(db, { email: "b2@x.test", username: "bcast2", password: "password1" });
    const banned = await registerUser(db, { email: "b3@x.test", username: "bcast3", password: "password1" });
    await db.update(users).set({ banned: true }).where(eq(users.id, banned));
    const before = await broadcastRecipientCount(db);
    const sent = await broadcastChat(db, "  Weekend promo: spin twice!  ");
    expect(sent).toBe(before);
    expect(await userUnreadCount(db, a)).toBe(1); // the player sees it as new
    expect((await readChat(db, a, "user")).at(-1)).toMatchObject({ sender: "admin", body: "Weekend promo: spin twice!", kind: "broadcast" });
    expect((await readChat(db, b, "user")).at(-1)?.body).toBe("Weekend promo: spin twice!");
    expect((await readChat(db, banned, "user")).some((m) => m.body.startsWith("Weekend promo"))).toBe(false);
    const adminRow = await db.select().from(users).where(eq(users.role, "admin"));
    expect((await readChat(db, adminRow[0].id, "user")).some((m) => m.body.startsWith("Weekend promo"))).toBe(false);
    // a broadcast alone does not put every player in the admin's list...
    expect((await chatConversations(db)).some((c) => c.userId === b)).toBe(false);
    // ...but a reply from the player does, and the thread still shows the broadcast
    await postChat(db, b, "user", "thanks!");
    expect((await chatConversations(db)).find((c) => c.userId === b)?.last).toBe("thanks!");
    expect((await readChat(db, b, "admin")).map((m) => m.body)).toEqual(["Weekend promo: spin twice!", "thanks!"]);
  });
  it("rejects empty and oversized messages", async () => {
    expect(await code(broadcastChat(db, "   "))).toBe("invalid");
    expect(await code(broadcastChat(db, "x".repeat(1001)))).toBe("invalid");
  });
});

describe("player history for the admin", () => {
  it("shows games played, where credits went and where they came from", async () => {
    const [{ id: adminId }] = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
    const ref = await registerUser(db, { email: "h0@x.test", username: "historian0", password: "password1" });
    const [{ referralCode }] = await db.select().from(users).where(eq(users.id, ref));
    const id = await registerUser(db, { email: "h1@x.test", username: "historian1", password: "password1", ref: referralCode });
    await spinWheel(db, id);
    await spinWheel(db, id); // the two free welcome spins
    await grantCreditsAndNotify(db, id, 500);
    for (let i = 0; i < 3; i++) await spinWheel(db, id); // paid spins
    const h = await userHistory(db, id);
    expect(h).not.toBeNull();
    expect(h!.user.email).toBe("h1@x.test");
    expect(h!.referrer?.username).toBe("historian0");
    const welcome = h!.games.find((g) => g.game === "Welcome wheel");
    const lucky = h!.games.find((g) => g.game === "Lucky Spin");
    expect(welcome).toMatchObject({ plays: 2, spent: 0 });
    expect(lucky).toMatchObject({ plays: 3, spent: 150 });
    expect(h!.totals.plays).toBe(5);
    expect(h!.totals.spent).toBe(150);
    expect(h!.totals.addedByAdmin).toBeGreaterThanOrEqual(500);
    expect(h!.spins).toHaveLength(5);
    expect(h!.spins[0].game).toBe("Lucky Spin"); // newest first
    // the ledger explains the balance exactly
    expect(h!.transactions.reduce((t, r) => t + r.amount, 0)).toBe(h!.user.balance);
    expect(adminId).toBeGreaterThan(0);
  });
  it("returns null for an unknown player", async () => {
    expect(await userHistory(db, 987654)).toBeNull();
  });
});

describe("bet size", () => {
  async function richPlayer(name: string) {
    const id = await registerUser(db, { email: `${name}@x.test`, username: name, password: "password1" });
    await db.update(users).set({ welcomeSpins: 0 }).where(eq(users.id, id));
    await adminAdjust(db, id, 50000, "test funds");
    return id;
  }
  it("charges the chosen bet and pays in proportion", async () => {
    const id = await richPlayer("bettor1");
    for (const bet of [1, 5, 50, 333, 1000]) {
      const before = await totalOf(id);
      const r = await spinWheel(db, id, bet);
      expect(r.cost).toBe(bet);
      expect(await totalOf(id)).toBe(before - bet + r.prize);
      expect(r.balance).toBe(before - bet + r.prize); // the balance shown is the one inside the game
      expect(r.prize).toBeLessThanOrEqual(bet * 20 + 1); // best segment is 20x
    }
    await exitGame(db, id);
    const rows = await listTransactions(db, id, 200);
    expect(rows.reduce((t, x) => t + x.amount, 0)).toBe(await balanceOf(id)); // the ledger still adds up
  });
  it("rejects bets outside 1 to 1000 and bets above the balance", async () => {
    const id = await richPlayer("bettor2");
    for (const bad of [0, -5, 1001, 1.5, Number.NaN]) expect(await code(spinWheel(db, id, bad))).toBe("bad_bet");
    const poor = await registerUser(db, { email: "poor2@x.test", username: "poorbettor", password: "password1" });
    await db.update(users).set({ welcomeSpins: 0 }).where(eq(users.id, poor));
    await adminAdjust(db, poor, 100, "small");
    expect(await code(spinWheel(db, poor, 101))).toBe("insufficient_credits");
    expect(await balanceOf(poor)).toBe(100);
    expect(await code(spinWheel(db, poor, 100))).toBe("ok");
  });
  it("gives XP in proportion to the bet", async () => {
    const id = await richPlayer("bettor3");
    const [{ xp: x0 }] = await db.select().from(users).where(eq(users.id, id));
    await spinWheel(db, id, 1000); // 200 XP
    const [{ xp: x1 }] = await db.select().from(users).where(eq(users.id, id));
    expect(x1 - x0).toBe(200);
    await spinWheel(db, id, 4); // too small for any XP
    const [{ xp: x2 }] = await db.select().from(users).where(eq(users.id, id));
    expect(x2 - x1).toBe(0);
  });
  it("lets the free welcome spins ignore the bet", async () => {
    const id = await registerUser(db, { email: "wb@x.test", username: "welcomebet", password: "password1" });
    const r = await spinWheel(db, id, 1000);
    expect(r).toMatchObject({ welcome: true, cost: 0 });
  });
});

describe("credit request from a game", () => {
  async function broke(name: string) {
    const id = await registerUser(db, { email: `${name}@x.test`, username: name, password: "password1" });
    await db.update(users).set({ welcomeSpins: 0 }).where(eq(users.id, id));
    return id;
  }
  const gameId = async (slug: string) => (await db.select().from(games).where(eq(games.slug, slug)))[0].id;
  it("posts \"I want credits in <game>\" with the real game name when the player has nothing to play with", async () => {
    const id = await broke("brokeone");
    const r = await requestCredits(db, id, { gameId: await gameId("lucky-spin") });
    expect(r).toMatchObject({ sent: true, game: "Lucky Spin Wheel" });
    expect((await readChat(db, id, "admin")).map((m) => [m.sender, m.body])).toEqual([["user", "I want credits in Lucky Spin Wheel"]]);
  });
  it("does nothing while the player still has credits or free spins, or is the admin", async () => {
    const withCredits = await broke("richone");
    await adminAdjust(db, withCredits, 5, "x");
    expect(await requestCredits(db, withCredits, { gameId: await gameId("card-quest") })).toMatchObject({ sent: false, reason: "has_credits" });
    const fresh = await registerUser(db, { email: "freshone@x.test", username: "freshone", password: "password1" }); // still has the 2 free spins
    expect(await requestCredits(db, fresh, { gameId: await gameId("card-quest") })).toMatchObject({ sent: false, reason: "has_credits" });
    const [admin] = await db.select().from(users).where(eq(users.role, "admin"));
    expect(await requestCredits(db, admin.id, { gameId: await gameId("card-quest") })).toMatchObject({ sent: false });
    expect(await readChat(db, withCredits, "admin")).toHaveLength(0);
  });
  it("does not repeat an unanswered request, but asks again after the admin has answered", async () => {
    const id = await broke("brokethree");
    const g = await gameId("tower-stack");
    expect((await requestCredits(db, id, { gameId: g })).sent).toBe(true);
    expect(await requestCredits(db, id, { gameId: g })).toMatchObject({ sent: false, reason: "already_requested" });
    expect((await requestCredits(db, id, { gameId: await gameId("comet-run") })).sent).toBe(true); // a different game is a different request
    await postChat(db, id, "admin", "one moment");
    expect((await requestCredits(db, id, { gameId: g })).sent).toBe(true);
    expect((await readChat(db, id, "admin")).filter((m) => m.body === "I want credits in Tower Stack")).toHaveLength(2);
  });
  it("the plain wallet request still works and is also not repeated", async () => {
    const id = await broke("brokefour");
    expect(await requestCredits(db, id)).toMatchObject({ sent: true });
    expect(await requestCredits(db, id)).toMatchObject({ sent: false, reason: "already_requested" });
    expect((await readChat(db, id, "admin"))[0].body).toBe("I need a top-up");
  });
  it("rejects an unknown game", async () => {
    const id = await broke("brokefive");
    expect(await code(requestCredits(db, id, { gameId: 424242 }))).toBe("not_found");
  });
});

describe("game sessions", () => {
  const gid = async (slug: string) => (await db.select().from(games).where(eq(games.slug, slug)))[0].id;
  async function player(name: string, credits: number) {
    const id = await registerUser(db, { email: `${name}@x.test`, username: name, password: "password1" });
    await db.update(users).set({ welcomeSpins: 0 }).where(eq(users.id, id));
    if (credits) await adminAdjust(db, id, credits, "funds");
    return id;
  }
  it("entering a game takes the credits in (wallet shows 0) and leaving brings the rest back", async () => {
    const id = await player("seat1", 300);
    const s = await enterGame(db, id, await gid("card-quest"));
    expect(s).toMatchObject({ stake: 300, balance: 300, gameTitle: "Card Quest" });
    expect(await balanceOf(id)).toBe(0);
    expect(await exitGame(db, id)).toMatchObject({ returned: 300, game: "Card Quest" });
    expect(await balanceOf(id)).toBe(300);
    expect(await getOpenSession(db, id)).toBeNull();
    expect(await exitGame(db, id)).toBeNull(); // leaving twice is harmless
  });
  it("opens no session without credits, or for a game that does not use credits", async () => {
    const broke = await player("seat2", 0);
    expect(await enterGame(db, broke, await gid("card-quest"))).toBeNull();
    const rich = await player("seat3", 100);
    const free = await gid("memory-mint");
    await db.update(games).set({ walletMode: "none" }).where(eq(games.id, free));
    expect(await enterGame(db, rich, free)).toBeNull();
    expect(await balanceOf(rich)).toBe(100);
    expect(await code(enterGame(db, rich, 999999))).toBe("not_found");
  });
  it("one game at a time: entering another game brings the first game's credits home and takes them into the new one", async () => {
    const id = await player("seat4", 200);
    await enterGame(db, id, await gid("tower-stack"));
    await db.update(gameSessions).set({ balance: 120 }).where(eq(gameSessions.userId, id)); // lost 80 in the first game
    const second = await enterGame(db, id, await gid("comet-run"));
    expect(second).toMatchObject({ gameTitle: "Comet Run", stake: 120, balance: 120 });
    const open = await db.select().from(gameSessions).where(eq(gameSessions.userId, id));
    expect(open.filter((r) => r.status === "open")).toHaveLength(1);
    expect(open.find((r) => r.status === "closed")?.returned).toBe(120);
  });
  it("credits added by the admin while in a game are taken into the game", async () => {
    const id = await player("seat5", 100);
    await enterGame(db, id, await gid("pixel-pop"));
    await adminAdjust(db, id, 50, "gift");
    expect(await balanceOf(id)).toBe(50);
    const again = await enterGame(db, id, await gid("pixel-pop"));
    expect(again).toMatchObject({ stake: 150, balance: 150 });
    expect(await balanceOf(id)).toBe(0);
  });
  it("the wheel is played from inside the game, and admin credits join it on the next spin", async () => {
    const id = await player("seat6", 400);
    const r1 = await spinWheel(db, id, 100);
    expect(r1.inGame).toBe(true);
    expect(await balanceOf(id)).toBe(0);
    await adminAdjust(db, id, 1000, "gift");
    const r2 = await spinWheel(db, id, 1000); // only possible because the gift moved into the game
    expect(r2.inGame).toBe(true);
    expect(await balanceOf(id)).toBe(0);
    expect((await getOpenSession(db, id))?.gameSlug).toBe("lucky-spin");
  });
  it("a session nobody touches gives the credits back", async () => {
    const id = await player("seat7", 250);
    await enterGame(db, id, await gid("word-orbit"));
    await closeExpiredSessions(db, id);
    expect(await balanceOf(id)).toBe(0); // still fresh: nothing happens
    await db.update(gameSessions).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(gameSessions.userId, id));
    await closeExpiredSessions(db, id);
    expect(await balanceOf(id)).toBe(250);
    expect(await getOpenSession(db, id)).toBeNull();
  });
  it("a player with credits inside a game is not treated as out of credits", async () => {
    const id = await player("seat8", 100);
    await enterGame(db, id, await gid("tile-tango"));
    expect(await balanceOf(id)).toBe(0);
    expect(await requestCredits(db, id, { gameId: await gid("star-fortune") })).toMatchObject({ sent: false, reason: "has_credits" });
    void absorbWallet; // exported for the wheel; covered through the tests above
  });
});

describe("the game API (a game's own server)", () => {
  const gid = async (slug: string) => (await db.select().from(games).where(eq(games.slug, slug)))[0];
  async function inGame(name: string, credits: number, slug = "number-nest") {
    const id = await registerUser(db, { email: `${name}@x.test`, username: name, password: "password1" });
    await db.update(users).set({ welcomeSpins: 0 }).where(eq(users.id, id));
    await adminAdjust(db, id, credits, "funds");
    const game = await gid(slug);
    const s = await enterGame(db, id, game.id);
    return { id, game, token: s!.token };
  }
  it("reads a session with the right key only", async () => {
    const { token, game } = await inGame("api1", 500);
    expect(await apiSession(db, token, game.apiKey)).toMatchObject({ status: "open", player: "api1", stake: 500, balance: 500, gameUsername: null });
    expect(await code(apiSession(db, token, "wrong-key"))).toBe("unauthorized");
    expect(await code(apiSession(db, "no-such-token", game.apiKey))).toBe("unauthorized");
    const other = await gid("history-hunt"); // another game's key does not open this game's session
    expect(await code(apiSession(db, token, other.apiKey))).toBe("unauthorized");
  });
  it("shows the player's own login name in the game when the admin saved one", async () => {
    const { id, token, game } = await inGame("api2", 100);
    await setGameAccount(db, id, game.id, "  ludo_king99 ");
    expect((await apiSession(db, token, game.apiKey)).gameUsername).toBe("ludo_king99");
    await setGameAccount(db, id, game.id, "ludo_king100"); // saving again replaces it
    expect((await listGameAccounts(db, id)).map((a) => a.username)).toEqual(["ludo_king100"]);
    await removeGameAccount(db, id, game.id);
    expect(await listGameAccounts(db, id)).toEqual([]);
    expect(await code(setGameAccount(db, id, game.id, "   "))).toBe("invalid");
  });
  it("accepts live balance reports without moving any credits", async () => {
    const { id, token, game } = await inGame("api3", 100);
    await apiReport(db, token, game.apiKey, 340);
    expect((await getOpenSession(db, id))?.balance).toBe(340);
    expect(await balanceOf(id)).toBe(0);
    for (const bad of [-1, 1.5, "10", null, 1e12]) expect(await code(apiReport(db, token, game.apiKey, bad))).toBe("bad_balance");
  });
  it("settles once: the final balance goes to the wallet, and settling again pays nothing", async () => {
    const { id, token, game } = await inGame("api4", 100);
    expect(await apiSettle(db, token, game.apiKey, 275)).toMatchObject({ ok: true, returned: 275 });
    expect(await balanceOf(id)).toBe(275);
    expect(await getOpenSession(db, id)).toBeNull();
    expect(await code(apiSettle(db, token, game.apiKey, 99999))).toBe("session_closed");
    expect(await balanceOf(id)).toBe(275);
    expect(await code(apiReport(db, token, game.apiKey, 5))).toBe("session_closed");
    const ledger = await listTransactions(db, id, 10);
    expect(ledger[0]).toMatchObject({ type: "game_return", amount: 275 });
    expect(ledger.reduce((t, r) => t + r.amount, 0)).toBe(275);
  });
  it("settling with 0 means the player lost everything", async () => {
    const { id, token, game } = await inGame("api5", 80);
    expect(await apiSettle(db, token, game.apiKey, 0)).toMatchObject({ returned: 0 });
    expect(await balanceOf(id)).toBe(0);
  });
  it("a new key makes the old one stop working", async () => {
    const { token, game } = await inGame("api6", 10);
    const fresh = await regenerateApiKey(db, game.id);
    expect(fresh).not.toBe(game.apiKey);
    expect(await code(apiSession(db, token, game.apiKey))).toBe("unauthorized");
    expect((await apiSession(db, token, fresh)).status).toBe("open");
  });
  it("builds the launch address without losing the game's own query", () => {
    const u = new URL(buildLaunchUrl("https://ludo.example/play?room=7", { origin: "https://arena.example", token: "tok", player: "ann", gameUsername: "ann_ludo", balance: 250 }));
    expect(u.searchParams.get("room")).toBe("7");
    expect(Object.fromEntries([...u.searchParams].filter(([k]) => k.startsWith("lucky_")))).toEqual({ lucky_session: "tok", lucky_site: "https://arena.example", lucky_player: "ann_ludo", lucky_balance: "250" });
    expect(new URL(buildLaunchUrl("https://x.example/", { origin: "o", token: "t", player: "ann", gameUsername: null, balance: 1 })).searchParams.get("lucky_player")).toBe("ann");
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

describe("social links", () => {
  it("accepts web links only", () => {
    expect(socialSchema.parse({ kind: "WhatsApp", url: "https://wa.me/123" }).label).toBe("");
    expect(() => socialSchema.parse({ kind: "Facebook", url: "javascript:alert(1)" })).toThrow();
    expect(socialSchema.parse({ kind: "WhatsApp", url: "+92 300 1234567" })).toMatchObject({ url: "https://wa.me/923001234567" }); // a number becomes a link
    expect(() => socialSchema.parse({ kind: "Facebook", url: "+92 300 1234567" })).toThrow(); // only for WhatsApp
    expect(() => socialSchema.parse({ kind: "Nope", url: "https://x.com" })).toThrow();
  });
});

describe("sign-in return path", () => {
  it("only returns to this site", () => {
    expect(safeNext("/play/ludo")).toBe("/play/ludo");
    expect(safeNext("//evil.com")).toBeUndefined();
    expect(safeNext("https://evil.com")).toBeUndefined();
    expect(safeNext(undefined)).toBeUndefined();
  });
});

describe("chat pictures", () => {
  const PNG = "data:image/png;base64," + Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 1, 2, 3]).toString("base64");
  it("stores real pictures and only shows them in the right conversation", async () => {
    const a = await registerUser(db, { email: "pic1@x.test", username: "pic_one", password: "password1" });
    const b = await registerUser(db, { email: "pic2@x.test", username: "pic_two", password: "password1" });
    const id = await saveChatImage(db, a, PNG);
    await postChat(db, a, "user", "", id); // a picture alone is a valid message
    expect((await readChat(db, a, "admin")).at(-1)).toMatchObject({ imageId: id, body: "" });
    expect((await readChatImage(db, id, { id: a, role: "user" })).mime).toBe("image/png");
    expect((await readChatImage(db, id, { id: 1, role: "admin" })).bytes.length).toBeGreaterThan(8);
    expect(await code(readChatImage(db, id, { id: b, role: "user" }))).toBe("not_found"); // another player cannot open it
    expect(await code(postChat(db, b, "user", "mine now", id))).toBe("invalid"); // nor send someone else's upload
  });
  it("rejects files that are not pictures", async () => {
    const fake = "data:image/png;base64," + Buffer.from("<svg onload=alert(1)>hello world").toString("base64");
    expect(await code(saveChatImage(db, 1, fake))).toBe("invalid");
    expect(await code(saveChatImage(db, 1, "data:text/html;base64,AAAA"))).toBe("invalid");
    expect(await code(postChat(db, 1, "user", "   "))).toBe("invalid");
  });
});

describe("player tags", () => {
  it("keeps a clean, de-duplicated list", () => {
    expect(joinTags(["ludo: ali99", " vip ", "vip", "", "a|b"])).toBe("ludo: ali99|vip|a b");
    expect(tagList("ludo: ali99|vip")).toEqual(["ludo: ali99", "vip"]);
    expect(tagList("")).toEqual([]);
    expect(joinTags(Array.from({ length: 12 }, (_, i) => `t${i}`)).split("|")).toHaveLength(8);
  });
});

describe("linked game needs a username first", () => {
  it("asks the admin once, and again only after they answered", async () => {
    const u = await registerUser(db, { email: "acct@x.test", username: "acct_user", password: "password1" });
    const [g] = await db.insert(games).values({ slug: "ludo-acct", title: "Ludo Test", category: "Arcade", link: "https://example.com" }).returning();
    expect((await requestGameAccount(db, u, g.id)).sent).toBe(true);
    expect((await requestGameAccount(db, u, g.id)).sent).toBe(false); // unanswered: not repeated
    expect((await readChat(db, u, "admin")).map((m) => m.body)).toEqual(["I want username and password for Ludo Test"]);
    await postChat(db, u, "admin", "ali99 / pass");
    await setGameAccount(db, u, g.id, "ali99");
    expect((await listGameAccounts(db, u)).map((a) => a.username)).toEqual(["ali99"]);
    // a page that is older than the admin's change: no new message, the player is told to go in
    expect(await requestGameAccount(db, u, g.id)).toMatchObject({ sent: false, hasAccount: true });
    expect((await readChat(db, u, "admin")).filter((m) => m.body.startsWith("I want username")).length).toBe(1);
  });
});

describe("wallet cards", () => {
  it("sends the chosen card to the admin chat", async () => {
    const u = await registerUser(db, { email: "wc@x.test", username: "wallet_card", password: "password1" });
    const [top] = await db.insert(walletOptions).values({ kind: "topup", title: "500 credits" }).returning();
    const [rew] = await db.insert(walletOptions).values({ kind: "reward", title: "VIP badge" }).returning();
    const [off] = await db.insert(walletOptions).values({ kind: "topup", title: "Hidden", active: false }).returning();
    expect((await requestWalletOption(db, u, top.id)).sent).toBe(true);
    expect((await requestWalletOption(db, u, top.id)).sent).toBe(false); // unanswered: not repeated
    await requestWalletOption(db, u, rew.id);
    expect(await code(requestWalletOption(db, u, off.id))).toBe("not_found");
    expect((await readChat(db, u, "admin")).map((m) => m.body)).toEqual(["I need a top-up: 500 credits", "I want the reward: VIP badge"]);
  });
});

describe("chat reactions and deleting", () => {
  it("keeps one reaction per side and deletes for one side only", async () => {
    const u = await registerUser(db, { email: "rx@x.test", username: "react_user", password: "password1" });
    const mine = await postChat(db, u, "user", "hello there");
    const theirs = await postChat(db, u, "admin", "hi!");
    await reactChatMessage(db, u, mine.id, "admin", "👍");
    await reactChatMessage(db, u, mine.id, "user", "👍");
    await reactChatMessage(db, u, mine.id, "user", "❤️"); // changing replaces the old one
    const asUser = (await chatMeta(db, u, "user")).find((m) => m.id === mine.id)!;
    expect(asUser.reactions).toEqual(expect.arrayContaining([{ emoji: "👍", count: 1, mine: false }, { emoji: "❤️", count: 1, mine: true }]));
    await reactChatMessage(db, u, mine.id, "user", null);
    expect((await chatMeta(db, u, "user")).find((m) => m.id === mine.id)!.reactions).toEqual([{ emoji: "👍", count: 1, mine: false }]);
    expect(await code(reactChatMessage(db, u, mine.id, "user", "🧨"))).toBe("invalid");

    // "Delete for me": gone from one side only
    await deleteChatMessage(db, u, mine.id, "user");
    expect((await readChat(db, u, "user")).some((m) => m.id === mine.id)).toBe(false);
    expect((await readChat(db, u, "admin")).find((m) => m.id === mine.id)).toMatchObject({ body: "hello there", deleted: false });
    expect((await chatMeta(db, u, "user")).find((m) => m.id === mine.id)?.hidden).toBe(true);
    expect((await chatMeta(db, u, "admin")).find((m) => m.id === mine.id)?.hidden).toBe(false);
    await deleteChatMessage(db, u, theirs.id, "admin"); // the admin hides the admin's own message from the admin view
    expect((await readChat(db, u, "user")).some((m) => m.id === theirs.id)).toBe(true);
    expect(await code(deleteChatMessage(db, u, 999999, "user"))).toBe("not_found");
  });
});

describe("invite post text", () => {
  it("fills in the placeholders for each player", () => {
    expect(fillCaption("Join {site}! Code {code}, free chips: {bonus}", { site: "Royal Club", code: "AB12CD", bonus: "FREE500" })).toBe("Join Royal Club! Code AB12CD, free chips: FREE500");
    expect(fillCaption("{code} {code}", { site: "x", code: "Z9", bonus: "" })).toBe("Z9 Z9");
  });
});

describe("the scrolling strip", () => {
  it("only shows real wins, with half-hidden names", async () => {
    const u = await registerUser(db, { email: "tk@x.test", username: "ticker_user", password: "password1" });
    await db.insert(spins).values([
      { userId: u, segmentId: 1, label: "big", cost: 50, prize: 431 },
      { userId: u, segmentId: 1, label: "small", cost: 50, prize: 17 }, // too small to show
      { userId: u, segmentId: 1, label: "free", cost: 0, prize: 977 }, // a free welcome spin is not shown
    ]);
    const wins = await recentWins(db);
    expect(wins[0]).toEqual({ who: "ti...", prize: 431 });
    expect(wins.some((w) => w.prize === 17 || w.prize === 977)).toBe(false);
    expect(maskName("abcdef")).toBe("ab...");
  });
});
