import bcrypt from "bcryptjs";
import { and, asc, count, desc, eq, gt, inArray, ne, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { chatMessages, games, promoClaims, promotions, spins, supportRequests, transactions, users, wheelSegments } from "@/db/schema";
import {
  DAILY_BONUS_BASE,
  DAILY_COOLDOWN_MS,
  MAX_BET,
  MIN_BET,
  REFERRAL_BONUS,
  REFERRAL_MAX_REWARDS,
  SIGNUP_BONUS,
  SPIN_COST,
  SPIN_XP,
  WELCOME_SPINS,
} from "./config";
import { tierForXp } from "./vip";
import { payout, pickSegment } from "./wheel";

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export function isUniqueViolation(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === "23505" || err?.cause?.code === "23505";
}

function newReferralCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

/** Adds (or removes, when negative) virtual credits and writes the ledger row. Never lets the balance go below 0. */
export async function applyCredits(db: Db, userId: number, amount: number, type: string, note = "") {
  const [row] = await db
    .update(users)
    .set({ balance: sql`${users.balance} + ${amount}` })
    .where(and(eq(users.id, userId), sql`${users.balance} + ${amount} >= 0`))
    .returning({ balance: users.balance });
  if (!row) throw new AppError("insufficient_credits", "Not enough credits.", 402);
  await db.insert(transactions).values({ userId, type, amount, balanceAfter: row.balance, note });
  return row.balance;
}

export async function registerUser(
  db: Db,
  input: { email: string; username: string; password: string; ref?: string | null },
) {
  const email = input.email.trim().toLowerCase();
  const username = input.username.trim();
  const passwordHash = await bcrypt.hash(input.password, 10);
  try {
    return await db.transaction(async (tx) => {
      const [byEmail] = await tx.select({ id: users.id }).from(users).where(eq(users.email, email));
      if (byEmail) throw new AppError("email_taken", "That email is already registered.", 409);
      const [byName] = await tx
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.username}) = ${username.toLowerCase()}`);
      if (byName) throw new AppError("username_taken", "That username is taken.", 409);

      let referrer: { id: number } | undefined;
      if (input.ref) {
        [referrer] = await tx
          .select({ id: users.id })
          .from(users)
          .where(eq(users.referralCode, input.ref.trim().toUpperCase()));
      }

      const [user] = await tx
        .insert(users)
        .values({ email, username, passwordHash, referralCode: newReferralCode(), referredBy: referrer?.id ?? null, welcomeSpins: WELCOME_SPINS })
        .returning();
      if (SIGNUP_BONUS > 0) await applyCredits(tx as unknown as Db, user.id, SIGNUP_BONUS, "signup_bonus", "Welcome bonus");

      if (referrer) {
        const [{ value: rewarded }] = await tx
          .select({ value: count() })
          .from(transactions)
          .where(and(eq(transactions.userId, referrer.id), eq(transactions.type, "referral_bonus")));
        if (rewarded < REFERRAL_MAX_REWARDS) {
          await applyCredits(tx as unknown as Db, user.id, REFERRAL_BONUS, "referral_bonus", "Joined with a referral link");
          await applyCredits(tx as unknown as Db, referrer.id, REFERRAL_BONUS, "referral_bonus", `Referral: ${username} joined`);
        }
      }
      return user.id;
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError("duplicate", "Email or username is already registered.", 409);
    throw e;
  }
}

export async function verifyLogin(db: Db, identifier: string, password: string) {
  const id = identifier.trim().toLowerCase();
  const [user] = await db
    .select()
    .from(users)
    .where(sql`${users.email} = ${id} or lower(${users.username}) = ${id}`);
  // Same work and same message whether the user exists or not.
  const hash = user?.passwordHash ?? "$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
  const ok = await bcrypt.compare(password, hash);
  if (!user || !ok) throw new AppError("bad_credentials", "Incorrect email/username or password.", 401);
  if (user.banned) throw new AppError("banned", "This account is suspended.", 403);
  return user;
}

export async function activeWheel(db: Db, kind: "main" | "welcome" = "main") {
  return db
    .select()
    .from(wheelSegments)
    .where(and(eq(wheelSegments.active, true), eq(wheelSegments.kind, kind)))
    .orderBy(wheelSegments.sortOrder, wheelSegments.id);
}

export async function spinWheel(db: Db, userId: number, bet: number = SPIN_COST) {
  return db.transaction(async (tx) => {
    const t = tx as unknown as Db;
    // Lock the player's row so two parallel requests cannot spend the same welcome spin twice.
    const [player] = await t.select({ welcomeSpins: users.welcomeSpins }).from(users).where(eq(users.id, userId)).for("update");
    if (!player) throw new AppError("not_found", "User not found.", 404);
    if (player.welcomeSpins > 0) return welcomeSpin(t, userId, player.welcomeSpins); // free spins ignore the bet
    if (!Number.isInteger(bet) || bet < MIN_BET || bet > MAX_BET) throw new AppError("bad_bet", `Bet must be a whole number from ${MIN_BET} to ${MAX_BET}.`);
    const segments = await activeWheel(t);
    if (segments.length < 2) throw new AppError("wheel_unavailable", "The wheel is not configured right now.", 503);
    await applyCredits(t, userId, -bet, "spin_cost", "Lucky Spin");
    const segment = pickSegment(segments);
    const prize = payout(segment.credits, bet, SPIN_COST);
    let balance: number;
    if (prize > 0) {
      balance = await applyCredits(t, userId, prize, "spin_win", `Won ${prize.toLocaleString("en-US")}`);
    } else {
      const [u] = await t.select({ balance: users.balance }).from(users).where(eq(users.id, userId));
      balance = u.balance;
    }
    const [u] = await t
      .update(users)
      .set({ xp: sql`${users.xp} + ${Math.floor((bet * SPIN_XP) / SPIN_COST)}` }) // XP grows with what you stake
      .where(eq(users.id, userId))
      .returning({ xp: users.xp });
    await t.insert(spins).values({ userId, segmentId: segment.id, label: segment.label, cost: bet, prize });
    return { segmentId: segment.id, label: segment.label, icon: segment.icon, prize, cost: bet, balance, xp: u.xp, welcome: false, welcomeLeft: 0 };
  });
}

/** Free spin on the small "welcome" wheel. Every new player gets WELCOME_SPINS of these, so at most that many prizes. */
async function welcomeSpin(t: Db, userId: number, left: number) {
  const segments = await activeWheel(t, "welcome");
  if (segments.length < 2) throw new AppError("wheel_unavailable", "The welcome wheel is not configured right now.", 503);
  const segment = pickSegment(segments);
  const [u] = await t
    .update(users)
    .set({ welcomeSpins: left - 1, xp: sql`${users.xp} + ${SPIN_XP}` })
    .where(eq(users.id, userId))
    .returning({ balance: users.balance, xp: users.xp });
  let balance = u.balance;
  if (segment.credits > 0) balance = await applyCredits(t, userId, segment.credits, "welcome_prize", `Welcome wheel: ${segment.label}`);
  await t.insert(spins).values({ userId, segmentId: segment.id, label: segment.label, cost: 0, prize: segment.credits });
  return { segmentId: segment.id, label: segment.label, icon: segment.icon, prize: segment.credits, cost: 0, balance, xp: u.xp, welcome: true, welcomeLeft: left - 1 };
}

export async function claimDaily(db: Db, userId: number, now = new Date()) {
  return db.transaction(async (tx) => {
    const t = tx as unknown as Db;
    const [user] = await t.select().from(users).where(eq(users.id, userId)).for("update");
    if (!user) throw new AppError("not_found", "User not found.", 404);
    if (user.lastDailyAt && now.getTime() - user.lastDailyAt.getTime() < DAILY_COOLDOWN_MS) {
      const waitMs = DAILY_COOLDOWN_MS - (now.getTime() - user.lastDailyAt.getTime());
      throw new AppError("cooldown", `Daily bonus is ready in ${Math.ceil(waitMs / 3600000)}h.`, 429);
    }
    const reward = DAILY_BONUS_BASE + tierForXp(user.xp).tier.dailyBonus;
    await t.update(users).set({ lastDailyAt: now }).where(eq(users.id, userId));
    const balance = await applyCredits(t, userId, reward, "daily_bonus", "Daily bonus");
    return { reward, balance };
  });
}

export async function claimPromo(db: Db, userId: number, code: string) {
  try {
    return await db.transaction(async (tx) => {
      const t = tx as unknown as Db;
      const [promo] = await t.select().from(promotions).where(eq(promotions.code, code));
      if (!promo || !promo.active) throw new AppError("not_found", "Promotion not found.", 404);
      if (!promo.claimable || promo.rewardCredits <= 0) throw new AppError("not_claimable", "This promotion has no claimable reward.");
      await t.insert(promoClaims).values({ userId, promoId: promo.id });
      const balance = await applyCredits(t, userId, promo.rewardCredits, "promo", promo.title);
      return { reward: promo.rewardCredits, balance };
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError("already_claimed", "You already claimed this promotion.", 409);
    throw e;
  }
}

export async function adminAdjust(db: Db, userId: number, amount: number, note: string) {
  if (!Number.isInteger(amount) || amount === 0) throw new AppError("bad_amount", "Amount must be a non-zero whole number.");
  const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId));
  if (!target) throw new AppError("not_found", "User not found.", 404);
  return applyCredits(db, userId, amount, "admin_adjust", note || "Admin adjustment");
}

export async function adminSetPassword(db: Db, userId: number, password: string) {
  const done = await db
    .update(users)
    .set({ passwordHash: await bcrypt.hash(password, 10) })
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  if (!done.length) throw new AppError("not_found", "User not found.", 404);
}

/**
 * A player asks for a password reset. We only record the request for the admin; nothing is changed and nothing
 * about whether the account exists is revealed to the caller.
 */
export async function createResetRequest(db: Db, identifier: string) {
  const id = identifier.trim().toLowerCase();
  const [user] = await db.select({ id: users.id }).from(users).where(sql`${users.email} = ${id} or lower(${users.username}) = ${id}`);
  const [dup] = await db
    .select({ id: supportRequests.id })
    .from(supportRequests)
    .where(and(eq(supportRequests.status, "open"), user ? eq(supportRequests.userId, user.id) : eq(supportRequests.identifier, id)));
  if (dup) return;
  await db.insert(supportRequests).values({ identifier: id, userId: user?.id ?? null });
}

export async function setRequestStatus(db: Db, requestId: number, status: "open" | "done" | "dismissed") {
  const done = await db.update(supportRequests).set({ status }).where(eq(supportRequests.id, requestId)).returning({ id: supportRequests.id });
  if (!done.length) throw new AppError("not_found", "Request not found.", 404);
}

/* ---------- support chat (one thread per player, text only) ---------- */

export async function postChat(db: Db, userId: number, sender: "user" | "admin", body: string) {
  const text = body.trim();
  if (!text) throw new AppError("invalid", "Write a message first.");
  if (text.length > 1000) throw new AppError("invalid", "Message is too long (max 1000 characters).");
  const [row] = await db
    .insert(chatMessages)
    .values({ userId, sender, body: text, readByAdmin: sender === "admin", readByUser: sender === "user" })
    .returning();
  return row;
}

/** Messages of one player's thread after `after`, oldest first. Marks the other side's messages as read. */
export async function readChat(db: Db, userId: number, viewer: "user" | "admin", after = 0) {
  const rows = await db
    .select()
    .from(chatMessages)
    .where(and(eq(chatMessages.userId, userId), gt(chatMessages.id, after)))
    .orderBy(asc(chatMessages.id))
    .limit(200);
  if (viewer === "user") {
    await db.update(chatMessages).set({ readByUser: true }).where(and(eq(chatMessages.userId, userId), eq(chatMessages.sender, "admin"), eq(chatMessages.readByUser, false)));
  } else {
    await db.update(chatMessages).set({ readByAdmin: true }).where(and(eq(chatMessages.userId, userId), eq(chatMessages.sender, "user"), eq(chatMessages.readByAdmin, false)));
  }
  return rows;
}

export async function userUnreadCount(db: Db, userId: number) {
  const [r] = await db
    .select({ n: count() })
    .from(chatMessages)
    .where(and(eq(chatMessages.userId, userId), eq(chatMessages.sender, "admin"), eq(chatMessages.readByUser, false)));
  return r.n;
}

const BROADCAST_CHUNK = 500;

/** Players who would receive a message sent to all: everyone except admins and banned accounts. */
export async function broadcastRecipientCount(db: Db) {
  const [r] = await db.select({ n: count() }).from(users).where(and(eq(users.role, "user"), eq(users.banned, false)));
  return r.n;
}

/** One message into every player's chat at once (a promotion, an announcement). Returns how many players got it. */
export async function broadcastChat(db: Db, body: string) {
  const text = body.trim();
  if (!text) throw new AppError("invalid", "Write the message first.");
  if (text.length > 1000) throw new AppError("invalid", "Message is too long (max 1000 characters).");
  return db.transaction(async (tx) => {
    const t = tx as unknown as Db;
    const people = await t.select({ id: users.id }).from(users).where(and(eq(users.role, "user"), eq(users.banned, false)));
    for (let i = 0; i < people.length; i += BROADCAST_CHUNK) {
      await t.insert(chatMessages).values(
        people.slice(i, i + BROADCAST_CHUNK).map((p) => ({ userId: p.id, sender: "admin", body: text, kind: "broadcast", readByAdmin: true, readByUser: false })),
      );
    }
    return people.length;
  });
}

export async function adminUnreadCount(db: Db) {
  const [r] = await db.select({ n: count() }).from(chatMessages).where(and(eq(chatMessages.sender, "user"), eq(chatMessages.readByAdmin, false)));
  return r.n;
}

/** One row per player who has written, newest conversation first, with unread count and last message. */
export async function chatConversations(db: Db) {
  const agg = await db
    .select({
      userId: chatMessages.userId,
      lastId: sql<number>`max(${chatMessages.id})::int`,
      unread: sql<number>`count(*) filter (where ${chatMessages.sender} = 'user' and not ${chatMessages.readByAdmin})::int`,
    })
    .from(chatMessages)
    .where(ne(chatMessages.kind, "broadcast")) // a message sent to everyone should not put every player on top of the list
    .groupBy(chatMessages.userId)
    .orderBy(desc(sql`max(${chatMessages.id})`))
    .limit(100);
  if (agg.length === 0) return [];
  const [people, lasts] = await Promise.all([
    db.select({ id: users.id, username: users.username, email: users.email }).from(users).where(inArray(users.id, agg.map((a) => a.userId))),
    db.select({ id: chatMessages.id, body: chatMessages.body, sender: chatMessages.sender }).from(chatMessages).where(inArray(chatMessages.id, agg.map((a) => a.lastId))),
  ]);
  return agg.map((a) => {
    const u = people.find((p) => p.id === a.userId);
    const m = lasts.find((l) => l.id === a.lastId);
    return { userId: a.userId, username: u?.username ?? "deleted", email: u?.email ?? "", unread: a.unread, last: m?.body.slice(0, 80) ?? "", lastSender: m?.sender ?? "user" };
  });
}

/** Admin adds virtual credits to a player and tells them in the chat. */
export async function grantCreditsAndNotify(db: Db, userId: number, amount: number, note = "") {
  if (!Number.isInteger(amount) || amount < 1 || amount > 100000) throw new AppError("bad_amount", "Amount must be a whole number from 1 to 100,000.");
  return db.transaction(async (tx) => {
    const t = tx as unknown as Db;
    const balance = await adminAdjust(t, userId, amount, note || "Credits added on request");
    await postChat(t, userId, "admin", `Added ${amount.toLocaleString("en-US")} credits to your wallet. Balance: ${balance.toLocaleString("en-US")}.`);
    return balance;
  });
}

/** Everything an admin wants to know about one player: credits, games played, where credits went, and the ledger. */
export async function userHistory(db: Db, userId: number) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return null;
  const [referrer] = user.referredBy ? await db.select({ id: users.id, username: users.username, email: users.email }).from(users).where(eq(users.id, user.referredBy)) : [];
  const [referrals, allSpins, transactionsList, byType] = await Promise.all([
    db.select({ id: users.id, username: users.username, createdAt: users.createdAt }).from(users).where(eq(users.referredBy, userId)).orderBy(desc(users.id)).limit(20),
    db.select().from(spins).where(eq(spins.userId, userId)).orderBy(desc(spins.id)).limit(20000),
    listTransactions(db, userId, 100),
    db
      .select({ type: transactions.type, n: count(), total: sql<number>`coalesce(sum(${transactions.amount}), 0)::int` })
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .groupBy(transactions.type),
  ]);
  // Games: a free spin (cost 0) is the Welcome wheel, a paid one is Lucky Spin.
  const gameName = (cost: number) => (cost === 0 ? "Welcome wheel" : "Lucky Spin");
  const games = new Map<string, { game: string; plays: number; spent: number; won: number }>();
  for (const s of allSpins) {
    const g = games.get(gameName(s.cost)) ?? { game: gameName(s.cost), plays: 0, spent: 0, won: 0 };
    g.plays++;
    g.spent += s.cost;
    g.won += s.prize;
    games.set(g.game, g);
  }
  const typeTotal = (t: string) => byType.find((r) => r.type === t)?.total ?? 0;
  return {
    user,
    referrer: referrer ?? null,
    referrals,
    games: [...games.values()],
    spins: allSpins.slice(0, 50).map((s) => ({ ...s, game: gameName(s.cost) })),
    transactions: transactionsList,
    byType,
    totals: {
      plays: allSpins.length,
      spent: allSpins.reduce((t, s) => t + s.cost, 0),
      won: allSpins.reduce((t, s) => t + s.prize, 0),
      addedByAdmin: typeTotal("admin_adjust"),
    },
  };
}

export function listTransactions(db: Db, userId: number, limit = 50) {
  return db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.id)).limit(limit);
}

export async function userStats(db: Db, userId: number) {
  const [s] = await db
    .select({ plays: count(), won: sql<number>`coalesce(sum(${spins.prize}), 0)::int`, spent: sql<number>`coalesce(sum(${spins.cost}), 0)::int` })
    .from(spins)
    .where(eq(spins.userId, userId));
  const [r] = await db.select({ value: count() }).from(users).where(eq(users.referredBy, userId));
  return { plays: s.plays, won: s.won, spent: s.spent, referrals: r.value };
}

export async function lobbyGames(db: Db, opts: { q?: string; category?: string } = {}) {
  const rows = await db.select().from(games).where(eq(games.active, true)).orderBy(games.sortOrder, games.id);
  const q = opts.q?.trim().toLowerCase();
  return rows.filter((g) => {
    if (opts.category && opts.category !== "All") {
      if (opts.category === "Featured" ? !g.featured : g.category !== opts.category) return false;
    }
    return !q || g.title.toLowerCase().includes(q) || g.category.toLowerCase().includes(q);
  });
}
