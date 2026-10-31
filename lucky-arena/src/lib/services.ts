import { adminIds, notifyUsers } from "./push";
import { getTexts, unit } from "./texts";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, asc, count, desc, eq, gt, inArray, isNull, ne, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { chatImages, chatMessages, chatReactions, gameAccounts, gameSessions, games, promoClaims, promotions, spins, supportRequests, transactions, users, walletOptions, wheelSegments } from "@/db/schema";
import {
  CREDITS_PER_XP,
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
import { INTERNAL_TTL_MS, enterGame, getOpenSession } from "./game-sessions";
import { tierForXp } from "./vip";
import { payout, pickSegment } from "./wheel";

export { AppError, applyCredits, isUniqueViolation } from "./ledger";
import { AppError, applyCredits, isUniqueViolation } from "./ledger";

function newReferralCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export async function registerUser(
  db: Db,
  input: { email: string; username: string; password?: string; passwordHash?: string; ref?: string | null },
) {
  const email = input.email.trim().toLowerCase();
  const username = input.username.trim();
  const passwordHash = input.passwordHash ?? (await bcrypt.hash(input.password ?? "", 10));
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
    // Lock the player's row so two parallel requests cannot spend the same welcome spin or the same credits twice.
    const [player] = await t.select({ welcomeSpins: users.welcomeSpins }).from(users).where(eq(users.id, userId)).for("update");
    if (!player) throw new AppError("not_found", "User not found.", 404);
    if (player.welcomeSpins > 0) return welcomeSpin(t, userId, player.welcomeSpins); // free spins ignore the bet
    if (!Number.isInteger(bet) || bet < MIN_BET || bet > MAX_BET) throw new AppError("bad_bet", `Bet must be a whole number from ${MIN_BET} to ${MAX_BET}.`);
    const segments = await activeWheel(t);
    if (segments.length < 2) throw new AppError("wheel_unavailable", "The wheel is not configured right now.", 503);

    // The wheel is a game on this site: playing it means taking a seat, so the credits sit in the game, not the wallet.
    const [wheel] = await t.select({ id: games.id }).from(games).where(eq(games.slug, WHEEL_SLUG));
    let session = wheel ? await enterGame(t, userId, wheel.id) : null;
    if (session && session.gameId !== wheel!.id) session = null;
    const inGame = !!session;

    if (inGame) {
      const [paid] = await t
        .update(gameSessions)
        .set({ balance: sql`${gameSessions.balance} - ${bet}` })
        .where(and(eq(gameSessions.id, session!.id), sql`${gameSessions.balance} >= ${bet}`))
        .returning({ balance: gameSessions.balance });
      if (!paid) throw new AppError("insufficient_credits", "Not enough credits.", 402);
    } else {
      await applyCredits(t, userId, -bet, "spin_cost", "Lucky Spin");
    }

    const segment = pickSegment(segments);
    const prize = payout(segment.credits, bet, SPIN_COST);
    let balance: number;
    if (inGame) {
      const [won] = await t
        .update(gameSessions)
        .set({ balance: sql`${gameSessions.balance} + ${prize}`, expiresAt: new Date(Date.now() + INTERNAL_TTL_MS) })
        .where(eq(gameSessions.id, session!.id))
        .returning({ balance: gameSessions.balance });
      balance = won.balance;
    } else if (prize > 0) {
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
    return { segmentId: segment.id, label: segment.label, icon: segment.icon, prize, cost: bet, balance, xp: u.xp, welcome: false, welcomeLeft: 0, inGame };
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
  return { segmentId: segment.id, label: segment.label, icon: segment.icon, prize: segment.credits, cost: 0, balance, xp: u.xp, welcome: true, welcomeLeft: left - 1, inGame: false };
}

/** One free spin on the welcome wheel, once every 20 hours. It replaces the old daily credits. */
export async function claimDaily(db: Db, userId: number, now = new Date()) {
  return db.transaction(async (tx) => {
    const t = tx as unknown as Db;
    const [user] = await t.select().from(users).where(eq(users.id, userId)).for("update");
    if (!user) throw new AppError("not_found", "User not found.", 404);
    if (user.lastDailyAt && now.getTime() - user.lastDailyAt.getTime() < DAILY_COOLDOWN_MS) {
      const waitMs = DAILY_COOLDOWN_MS - (now.getTime() - user.lastDailyAt.getTime());
      throw new AppError("cooldown", `Your free daily spin is ready in ${Math.ceil(waitMs / 3600000)}h.`, 429);
    }
    const [u] = await t.update(users).set({ lastDailyAt: now, welcomeSpins: sql`${users.welcomeSpins} + 1` }).where(eq(users.id, userId)).returning({ welcomeSpins: users.welcomeSpins });
    return { spin: 1, welcomeSpins: u.welcomeSpins };
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
  const balance = await applyCredits(db, userId, amount, "admin_adjust", note || "Admin adjustment");
  // Credits the player receives count towards the level, slowly.
  if (amount > 0 && Math.floor(amount / CREDITS_PER_XP) > 0) await db.update(users).set({ xp: sql`${users.xp} + ${Math.floor(amount / CREDITS_PER_XP)}` }).where(eq(users.id, userId));
  return balance;
}

/** A player (or the admin, for a player) picks their own invite code: 4 to 12 letters or numbers, unique on the site. */
export async function setReferralCode(db: Db, userId: number, raw: string) {
  const code = raw.trim().toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(code)) throw new AppError("invalid", "The code must be 4 to 12 letters or numbers, no spaces.");
  try {
    const done = await db.update(users).set({ referralCode: code }).where(eq(users.id, userId)).returning({ id: users.id });
    if (!done.length) throw new AppError("not_found", "User not found.", 404);
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError("code_taken", "Someone already uses that code. Try another one.", 409);
    throw e;
  }
  return code;
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

/**
 * A visitor who is not signed in can still write to support (for example after "forgot password"). They get a throw-away
 * "guest" account (role guest: it cannot log in, never gets broadcasts) so the normal chat thread, admin list, unread
 * counts and replies all work unchanged. Their cookie only opens this guest thread, never a real player's.
 */
export async function createGuest(db: Db, tag = ""): Promise<number> {
  const rand = randomBytes(6).toString("hex");
  const [g] = await db
    .insert(users)
    .values({ email: `guest-${rand}@guest.invalid`, username: `guest_${rand.slice(0, 6)}`, passwordHash: "!", role: "guest", welcomeSpins: 0, balance: 0, referralCode: `G${rand.toUpperCase()}`, tag })
    .returning({ id: users.id });
  return g.id;
}

const IMAGE_MAX_BYTES = 1_500_000;
function sniffImage(b: Buffer): string | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 12 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.length > 12 && b.subarray(0, 4).toString("latin1") === "GIF8") return "image/gif";
  if (b.length > 12 && b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  return null;
}

/** Stores a picture for chat. Only real jpeg/png/gif/webp files up to about 1.5 MB are accepted (checked by content, not by name). */
export async function saveChatImage(db: Db, ownerId: number, dataUrl: string): Promise<number> {
  const m = /^data:image\/[a-z+.-]+;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) throw new AppError("invalid", "Choose a picture file.");
  const bytes = Buffer.from(m[1], "base64");
  if (bytes.length > IMAGE_MAX_BYTES) throw new AppError("too_big", "That picture is too big (max about 1.5 MB).", 413);
  const mime = sniffImage(bytes);
  if (!mime) throw new AppError("invalid", "Only JPG, PNG, GIF or WebP pictures can be sent.");
  const [row] = await db.insert(chatImages).values({ ownerId, mime, data: m[1] }).returning({ id: chatImages.id });
  return row.id;
}

/** A picture may be opened by the admin, or by the player whose conversation it was sent in. */
export async function readChatImage(db: Db, id: number, viewer: { id: number; role: string }) {
  const [img] = await db.select().from(chatImages).where(eq(chatImages.id, id));
  if (!img) throw new AppError("not_found", "Picture not found.", 404);
  if (viewer.role !== "admin") {
    const [m] = await db.select({ id: chatMessages.id }).from(chatMessages).where(and(eq(chatMessages.imageId, id), eq(chatMessages.userId, viewer.id), isNull(chatMessages.deletedAt), eq(chatMessages.hiddenByUser, false))).limit(1);
    if (!m) throw new AppError("not_found", "Picture not found.", 404);
  }
  return { mime: img.mime, bytes: Buffer.from(img.data, "base64") };
}

export const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

/** Deleted flags and reactions for the newest messages of a thread, so open chats can refresh what they already show. */
export async function chatMeta(db: Db, threadUserId: number, viewer: "user" | "admin") {
  const msgs = await db.select({ id: chatMessages.id, deletedAt: chatMessages.deletedAt, hidden: viewer === "user" ? chatMessages.hiddenByUser : chatMessages.hiddenByAdmin }).from(chatMessages).where(eq(chatMessages.userId, threadUserId)).orderBy(desc(chatMessages.id)).limit(200);
  if (msgs.length === 0) return [];
  const reacts = await db.select().from(chatReactions).where(inArray(chatReactions.messageId, msgs.map((m) => m.id)));
  return msgs.map((m) => {
    const mine = reacts.filter((r) => r.messageId === m.id);
    const groups = new Map<string, { emoji: string; count: number; mine: boolean }>();
    for (const r of mine) {
      const g = groups.get(r.emoji) ?? { emoji: r.emoji, count: 0, mine: false };
      g.count++;
      if (r.side === viewer) g.mine = true;
      groups.set(r.emoji, g);
    }
    return { id: m.id, deleted: !!m.deletedAt, hidden: m.hidden, reactions: m.deletedAt ? [] : [...groups.values()] };
  });
}

/** "Delete for me": the message disappears from this side only. The other person still sees it. */
export async function deleteChatMessage(db: Db, threadUserId: number, id: number, side: "user" | "admin") {
  const done = await db
    .update(chatMessages)
    .set(side === "user" ? { hiddenByUser: true } : { hiddenByAdmin: true })
    .where(and(eq(chatMessages.id, id), eq(chatMessages.userId, threadUserId)))
    .returning({ id: chatMessages.id });
  if (!done.length) throw new AppError("not_found", "Message not found.", 404);
}

/** One reaction per side on a message. null removes it. */
export async function reactChatMessage(db: Db, threadUserId: number, id: number, side: "user" | "admin", emoji: string | null) {
  const [m] = await db.select({ id: chatMessages.id, deletedAt: chatMessages.deletedAt }).from(chatMessages).where(and(eq(chatMessages.id, id), eq(chatMessages.userId, threadUserId)));
  if (!m || m.deletedAt) throw new AppError("not_found", "Message not found.", 404);
  if (emoji === null) {
    await db.delete(chatReactions).where(and(eq(chatReactions.messageId, id), eq(chatReactions.side, side)));
    return;
  }
  if (!REACTION_EMOJIS.includes(emoji)) throw new AppError("invalid", "Pick one of the reactions.");
  await db.insert(chatReactions).values({ messageId: id, side, emoji }).onConflictDoUpdate({ target: [chatReactions.messageId, chatReactions.side], set: { emoji } });
}

export async function postChat(db: Db, userId: number, sender: "user" | "admin", body: string, imageId?: number | null, replyToId?: number | null) {
  const text = body.trim();
  if (!text && !imageId) throw new AppError("invalid", "Write a message first.");
  if (imageId) {
    const [img] = await db.select({ ownerId: chatImages.ownerId }).from(chatImages).where(eq(chatImages.id, imageId));
    const [owner] = img ? await db.select({ role: users.role }).from(users).where(eq(users.id, img.ownerId)) : [];
    // A player can only send their own uploads; the admin can send any picture an admin uploaded (also quick-reply pictures).
    const okOwner = sender === "user" ? img?.ownerId === userId : owner?.role === "admin";
    if (!img || !okOwner) throw new AppError("invalid", "That picture cannot be sent.");
  }
  if (text.length > 1000) throw new AppError("invalid", "Message is too long (max 1000 characters).");
  // A reply can only point at a message in this same conversation; anything else is simply sent without the quote.
  let replyTo: number | null = null;
  if (replyToId) {
    const [target] = await db.select({ id: chatMessages.id }).from(chatMessages).where(and(eq(chatMessages.id, replyToId), eq(chatMessages.userId, userId)));
    replyTo = target?.id ?? null;
  }
  const [row] = await db
    .insert(chatMessages)
    .values({ userId, sender, body: text, imageId: imageId ?? null, replyToId: replyTo, readByAdmin: sender === "admin", readByUser: sender === "user" })
    .returning();
  // A phone notification for whoever is not looking at the site: the player gets the admin's reply, the admin gets the player's message.
  if (sender === "admin") void notifyUsers(db, [userId], { title: "Lucky Arena support", body: text.slice(0, 120) || "Sent a picture", url: "/chat" }, { skipActiveWithinMs: 20_000 });
  else void adminIds(db).then((ids) => notifyUsers(db, ids, { title: "New player message", body: text.slice(0, 120) || "Sent a picture", url: "/admin?tab=chat&user=" + userId }, { skipActiveWithinMs: 20_000 }));
  return row;
}

/** Messages of one player's thread after `after`, oldest first. Marks the other side's messages as read. */
export async function readChat(db: Db, userId: number, viewer: "user" | "admin", after = 0) {
  const rows = await db
    .select()
    .from(chatMessages)
    .where(and(eq(chatMessages.userId, userId), gt(chatMessages.id, after), eq(viewer === "user" ? chatMessages.hiddenByUser : chatMessages.hiddenByAdmin, false)))
    .orderBy(asc(chatMessages.id))
    .limit(200);
  if (viewer === "user") {
    await db.update(chatMessages).set({ readByUser: true }).where(and(eq(chatMessages.userId, userId), eq(chatMessages.sender, "admin"), eq(chatMessages.readByUser, false)));
  } else {
    await db.update(chatMessages).set({ readByAdmin: true }).where(and(eq(chatMessages.userId, userId), eq(chatMessages.sender, "user"), eq(chatMessages.readByAdmin, false)));
  }
  // A deleted message keeps its place but loses its content.
  return rows.map((r) => (r.deletedAt ? { ...r, body: "", imageId: null, deleted: true } : { ...r, deleted: false }));
}

export async function userUnreadCount(db: Db, userId: number) {
  const [r] = await db
    .select({ n: count() })
    .from(chatMessages)
    .where(and(eq(chatMessages.userId, userId), eq(chatMessages.sender, "admin"), eq(chatMessages.readByUser, false)));
  return r.n;
}

export const WHEEL_SLUG = "lucky-spin";
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
  const ids = await db.transaction(async (tx) => {
    const t = tx as unknown as Db;
    const people = await t.select({ id: users.id }).from(users).where(and(eq(users.role, "user"), eq(users.banned, false)));
    for (let i = 0; i < people.length; i += BROADCAST_CHUNK) {
      await t.insert(chatMessages).values(
        people.slice(i, i + BROADCAST_CHUNK).map((p) => ({ userId: p.id, sender: "admin", body: text, kind: "broadcast", readByAdmin: true, readByUser: false })),
      );
    }
    return people.map((p) => p.id);
  });
  void notifyUsers(db, ids, { title: "Lucky Arena", body: text.slice(0, 120), url: "/chat" }, { skipActiveWithinMs: 20_000 });
  return ids.length;
}

export async function adminUnreadCount(db: Db) {
  const [r] = await db.select({ n: count() }).from(chatMessages).where(and(eq(chatMessages.sender, "user"), eq(chatMessages.readByAdmin, false)));
  return r.n;
}

/** One row per player who has written, newest conversation first, with unread count and last message. */
/** A player counts as online if the site has seen them in this long. */
const ONLINE_MS = 2 * 60_000;

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
  const onlineSince = new Date(Date.now() - ONLINE_MS);
  // Players who are online right now are listed even if they have not written yet.
  const online = await db.select({ id: users.id }).from(users).where(and(gt(users.lastSeenAt, onlineSince), inArray(users.role, ["user", "guest"])));
  const ids = [...new Set([...agg.map((a) => a.userId), ...online.map((o) => o.id)])];
  if (ids.length === 0) return [];
  const [people, lasts] = await Promise.all([
    db.select({ id: users.id, username: users.username, nickname: users.nickname, email: users.email, tag: users.tag, lastSeenAt: users.lastSeenAt }).from(users).where(inArray(users.id, ids)),
    agg.length ? db.select({ id: chatMessages.id, body: chatMessages.body, sender: chatMessages.sender, deletedAt: chatMessages.deletedAt, imageId: chatMessages.imageId }).from(chatMessages).where(inArray(chatMessages.id, agg.map((a) => a.lastId))) : [],
  ]);
  const rows = ids.map((id) => {
    const a = agg.find((x) => x.userId === id);
    const u = people.find((p) => p.id === id);
    const m = a ? lasts.find((l) => l.id === a.lastId) : undefined;
    return {
      userId: id,
      username: u?.username ?? "deleted",
      nickname: u?.nickname ?? "",
      email: u?.email ?? "",
      tag: u?.tag ?? "",
      online: !!u?.lastSeenAt && u.lastSeenAt > onlineSince,
      unread: a?.unread ?? 0,
      last: m?.deletedAt ? "Message deleted" : m?.body.slice(0, 80) || (m?.imageId ? "📷 Picture" : ""),
      lastSender: m?.sender ?? "admin",
      lastId: a?.lastId ?? 0,
    };
  });
  // Unread first, then whoever wrote most recently.
  return rows.sort((x, y) => Number(y.unread > 0) - Number(x.unread > 0) || y.lastId - x.lastId);
}

const ACCOUNT_REPEAT_MS = 30 * 60_000;

/**
 * A player tapped a linked game but has no username for it yet. The admin gets "I want username and password for <game>"
 * in the chat (not repeated for 30 minutes while it is unanswered). Returns whether a message was posted.
 */
export async function requestGameAccount(db: Db, userId: number, gameId: number): Promise<{ sent: boolean; game: string; hasAccount?: boolean }> {
  const [game] = await db.select({ title: games.title }).from(games).where(and(eq(games.id, gameId), eq(games.active, true)));
  if (!game) throw new AppError("not_found", "Game not found.", 404);
  // The page may be older than the admin's change: if the username is already saved, nothing is requested and the player can go in.
  const [have] = await db.select({ id: gameAccounts.id }).from(gameAccounts).where(and(eq(gameAccounts.userId, userId), eq(gameAccounts.gameId, gameId)));
  if (have) return { sent: false, game: game.title, hasAccount: true };
  const body = `I want username and password for ${game.title}`;
  const [last] = await db
    .select({ id: chatMessages.id, createdAt: chatMessages.createdAt })
    .from(chatMessages)
    .where(and(eq(chatMessages.userId, userId), eq(chatMessages.sender, "user"), eq(chatMessages.body, body)))
    .orderBy(desc(chatMessages.id))
    .limit(1);
  if (last && Date.now() - last.createdAt.getTime() < ACCOUNT_REPEAT_MS) {
    const [answered] = await db.select({ id: chatMessages.id }).from(chatMessages).where(and(eq(chatMessages.userId, userId), eq(chatMessages.sender, "admin"), gt(chatMessages.id, last.id))).limit(1);
    if (!answered) return { sent: false, game: game.title };
  }
  await postChat(db, userId, "user", body);
  return { sent: true, game: game.title };
}

/** The player picked a top-up or reward card on the wallet page: the admin gets it in the chat. */
export async function requestWalletOption(db: Db, userId: number, optionId: number): Promise<{ sent: boolean; title: string }> {
  const [opt] = await db.select().from(walletOptions).where(and(eq(walletOptions.id, optionId), eq(walletOptions.active, true)));
  if (!opt) throw new AppError("not_found", "That option is not available.", 404);
  const body = opt.kind === "reward" ? `I want the reward: ${opt.title}` : `I need a top-up: ${opt.title}`;
  const [last] = await db
    .select({ id: chatMessages.id, createdAt: chatMessages.createdAt })
    .from(chatMessages)
    .where(and(eq(chatMessages.userId, userId), eq(chatMessages.sender, "user"), eq(chatMessages.body, body)))
    .orderBy(desc(chatMessages.id))
    .limit(1);
  if (last && Date.now() - last.createdAt.getTime() < ACCOUNT_REPEAT_MS) {
    const [answered] = await db.select({ id: chatMessages.id }).from(chatMessages).where(and(eq(chatMessages.userId, userId), eq(chatMessages.sender, "admin"), gt(chatMessages.id, last.id))).limit(1);
    if (!answered) return { sent: false, title: opt.title };
  }
  await postChat(db, userId, "user", body);
  return { sent: true, title: opt.title };
}

const REQUEST_REPEAT_MS = 30 * 60_000;

/**
 * A player asks the admin for credits. With a game id the message names it ("I want credits in <game>"); that automatic
 * version (clicking a game) is only sent when the player is really out of credits, and an unanswered identical request
 * is not repeated. Returns whether a message was posted and, if not, why.
 */
export async function requestCredits(db: Db, userId: number, opts: { gameId?: number; welcome?: boolean; signup?: boolean } = {}): Promise<{ sent: boolean; reason?: "has_credits" | "already_requested"; game?: string }> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new AppError("not_found", "User not found.", 404);
  let game: { title: string } | undefined;
  if (opts.gameId !== undefined) {
    [game] = await db.select({ title: games.title }).from(games).where(and(eq(games.id, opts.gameId), eq(games.active, true)));
    if (!game) throw new AppError("not_found", "Game not found.", 404);
    // Clicking a game only counts as "I need credits" when there is nothing to play with: no credits and no free spins left.
    const inGameCredits = (await getOpenSession(db, userId))?.balance ?? 0;
    if (user.balance + inGameCredits > 0 || user.welcomeSpins > 0 || user.role === "admin") return { sent: false, reason: "has_credits", game: game.title };
  }
  const texts = await getTexts(db);
  const body = game ? texts.msgGame.replaceAll("{game}", game.title) : opts.signup ? texts.msgSignup : opts.welcome ? `I want free ${texts.currency}` : texts.msgTopup;
  const [last] = await db
    .select({ id: chatMessages.id, createdAt: chatMessages.createdAt })
    .from(chatMessages)
    .where(and(eq(chatMessages.userId, userId), eq(chatMessages.sender, "user"), eq(chatMessages.body, body)))
    .orderBy(desc(chatMessages.id))
    .limit(1);
  if (last && Date.now() - last.createdAt.getTime() < REQUEST_REPEAT_MS) {
    const [answered] = await db.select({ id: chatMessages.id }).from(chatMessages).where(and(eq(chatMessages.userId, userId), eq(chatMessages.sender, "admin"), gt(chatMessages.id, last.id))).limit(1);
    if (!answered) return { sent: false, reason: "already_requested", game: game?.title };
  }
  await postChat(db, userId, "user", body);
  return { sent: true, game: game?.title };
}

/** Admin adds virtual credits to a player and tells them in the chat. */
export async function grantCreditsAndNotify(db: Db, userId: number, amount: number, note = "") {
  if (!Number.isInteger(amount) || amount < 1 || amount > 100000) throw new AppError("bad_amount", "Amount must be a whole number from 1 to 100,000.");
  return db.transaction(async (tx) => {
    const t = tx as unknown as Db;
    const balance = await adminAdjust(t, userId, amount, note || "Credits added on request");
    const w = (await getTexts(t)).currency;
    await postChat(t, userId, "admin", `Added ${amount.toLocaleString("en-US")} ${w} to your wallet. Balance: ${balance.toLocaleString("en-US")}.`);
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

export async function lobbyGames(db: Db, opts: { q?: string; category?: string; admin?: boolean } = {}) {
  // The game API key never leaves the server, and the admin link is only handed to admins.
  const rows = (await db.select().from(games).where(eq(games.active, true)).orderBy(games.sortOrder, games.id)).map((g) => ({ ...g, apiKey: "", adminLink: opts.admin ? g.adminLink : "" }));
  const q = opts.q?.trim().toLowerCase();
  return rows.filter((g) => {
    if (opts.category && opts.category !== "All") {
      if (opts.category === "Featured" ? !g.featured : g.category !== opts.category) return false;
    }
    return !q || g.title.toLowerCase().includes(q) || g.category.toLowerCase().includes(q);
  });
}

/** The admin tells a player what their balance is inside one game. It is only a message: the game keeps the real balance. */
export async function tellGameBalance(db: Db, userId: number, gameId: number, amount: number) {
  if (!Number.isInteger(amount) || amount < 0 || amount > 100_000_000) throw new AppError("bad_amount", "Type the balance as a whole number.");
  const [game] = await db.select({ title: games.title }).from(games).where(eq(games.id, gameId));
  if (!game) throw new AppError("not_found", "Game not found.", 404);
  const texts = await getTexts(db);
  return postChat(db, userId, "admin", `🎮 ${game.title} · ${amount.toLocaleString("en-US")} ${unit(amount, texts)}`);
}

/**
 * The player opens a game the admin told them a balance for: the green balance line goes to 0 in the chat. Does nothing
 * when the last balance told for this game is already 0 (or none was told).
 */
export async function zeroToldGameBalance(db: Db, userId: number, gameId: number) {
  const [game] = await db.select({ title: games.title }).from(games).where(eq(games.id, gameId));
  if (!game) return false;
  const [last] = await db
    .select({ body: chatMessages.body })
    .from(chatMessages)
    .where(and(eq(chatMessages.userId, userId), eq(chatMessages.sender, "admin"), sql`${chatMessages.body} like ${`🎮 ${game.title} · %`}`))
    .orderBy(desc(chatMessages.id))
    .limit(1);
  const told = Number(last?.body.slice(`🎮 ${game.title} · `.length).split(" ")[0].replaceAll(",", ""));
  if (!last || !(told > 0)) return false;
  await tellGameBalance(db, userId, gameId, 0);
  return true;
}
