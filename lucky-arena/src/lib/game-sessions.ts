import { randomBytes } from "node:crypto";
import { and, eq, lt, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { gameAccounts, gameSessions, games, users } from "@/db/schema";
import { AppError, applyCredits } from "./ledger";

/**
 * Game sessions: "taking a seat". When a player enters a game, the credits in their wallet move into the game (the wallet
 * then shows 0); the game holds them while they play; when they leave, whatever is left goes back to the wallet.
 * Games on this site track their own in-game balance here; a game on another address does it through the game API.
 */

export const INTERNAL_TTL_MS = 15 * 60_000; // a game on this site: the page keeps the session alive
export const EXTERNAL_TTL_MS = 6 * 60 * 60_000; // another address: the player can play for hours
export const MAX_REPORTED_BALANCE = 100_000_000;

export type GameSessionRow = typeof gameSessions.$inferSelect;

export interface OpenSession {
  id: number;
  token: string;
  gameId: number;
  gameTitle: string;
  gameSlug: string;
  external: boolean;
  stake: number;
  balance: number;
  expiresAt: Date;
}

const isExternal = (g: { link: string }) => g.link !== "";

export async function getOpenSession(db: Db, userId: number): Promise<OpenSession | null> {
  const [row] = await db
    .select({ s: gameSessions, title: games.title, slug: games.slug, link: games.link })
    .from(gameSessions)
    .innerJoin(games, eq(games.id, gameSessions.gameId))
    .where(and(eq(gameSessions.userId, userId), eq(gameSessions.status, "open")));
  if (!row) return null;
  return { id: row.s.id, token: row.s.token, gameId: row.s.gameId, gameTitle: row.title, gameSlug: row.slug, external: isExternal(row), stake: row.s.stake, balance: row.s.balance, expiresAt: row.s.expiresAt };
}

/** Closes one session and puts `final` (default: what is left in the game) back into the wallet. */
async function closeRow(t: Db, s: GameSessionRow, final?: number): Promise<number> {
  const amount = final ?? s.balance;
  const [g] = await t.select({ title: games.title }).from(games).where(eq(games.id, s.gameId));
  if (amount > 0) await applyCredits(t, s.userId, amount, "game_return", `Back from ${g?.title ?? "a game"}`);
  await t.update(gameSessions).set({ status: "closed", closedAt: new Date(), balance: amount, returned: amount }).where(eq(gameSessions.id, s.id));
  return amount;
}

/** Moves anything sitting in the wallet (for example credits the admin just added) into the open session. */
export async function absorbWallet(t: Db, userId: number, session: { id: number }): Promise<number> {
  const [u] = await t.select({ balance: users.balance }).from(users).where(eq(users.id, userId));
  if (!u || u.balance <= 0) return 0;
  const [g] = await t.select({ title: games.title }).from(gameSessions).innerJoin(games, eq(games.id, gameSessions.gameId)).where(eq(gameSessions.id, session.id));
  await applyCredits(t, userId, -u.balance, "game_stake", `Taken into ${g?.title ?? "the game"}`);
  await t.update(gameSessions).set({ stake: sql`${gameSessions.stake} + ${u.balance}`, balance: sql`${gameSessions.balance} + ${u.balance}` }).where(eq(gameSessions.id, session.id));
  return u.balance;
}

/** Enter a game. One game at a time: an open session in another game is closed first and its credits come back. */
export async function enterGame(db: Db, userId: number, gameId: number): Promise<OpenSession | null> {
  await db.transaction(async (tx) => {
    const t = tx as unknown as Db;
    await t.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("update");
    const [game] = await t.select().from(games).where(and(eq(games.id, gameId), eq(games.active, true)));
    if (!game) throw new AppError("not_found", "Game not found.", 404);
    const open = await t.select().from(gameSessions).where(and(eq(gameSessions.userId, userId), eq(gameSessions.status, "open")));
    const ttl = isExternal(game) ? EXTERNAL_TTL_MS : INTERNAL_TTL_MS;
    for (const s of open) {
      if (s.gameId === gameId) {
        await t.update(gameSessions).set({ expiresAt: new Date(Date.now() + ttl) }).where(eq(gameSessions.id, s.id));
        await absorbWallet(t, userId, s);
        return;
      }
      await closeRow(t, s);
    }
    if (game.walletMode === "none") return; // this game does not touch credits
    const [u] = await t.select({ balance: users.balance }).from(users).where(eq(users.id, userId));
    if (!u || u.balance <= 0) return; // nothing to take in
    await applyCredits(t, userId, -u.balance, "game_stake", `Taken into ${game.title}`);
    await t.insert(gameSessions).values({ userId, gameId, token: randomBytes(24).toString("hex"), stake: u.balance, balance: u.balance, expiresAt: new Date(Date.now() + ttl) });
  });
  return getOpenSession(db, userId);
}

/** Leave the game: what is left comes back to the wallet. Safe to call when no game is open. */
export async function exitGame(db: Db, userId: number): Promise<{ returned: number; game: string } | null> {
  return db.transaction(async (tx) => {
    const t = tx as unknown as Db;
    await t.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("update");
    const [s] = await t.select().from(gameSessions).where(and(eq(gameSessions.userId, userId), eq(gameSessions.status, "open")));
    if (!s) return null;
    const [g] = await t.select({ title: games.title }).from(games).where(eq(games.id, s.gameId));
    return { returned: await closeRow(t, s), game: g?.title ?? "" };
  });
}

/** The player is still there: keep the session from timing out. */
export async function touchSession(db: Db, userId: number) {
  await db
    .update(gameSessions)
    .set({ expiresAt: sql`greatest(${gameSessions.expiresAt}, now() + interval '15 minutes')` })
    .where(and(eq(gameSessions.userId, userId), eq(gameSessions.status, "open")));
}

/** Sessions nobody has touched for too long give the credits back, so nothing is ever stranded in a game. */
export async function closeExpiredSessions(db: Db, userId: number) {
  const [stale] = await db.select({ id: gameSessions.id }).from(gameSessions).where(and(eq(gameSessions.userId, userId), eq(gameSessions.status, "open"), lt(gameSessions.expiresAt, new Date()))).limit(1);
  if (stale) await exitGame(db, userId);
}

/* ---------- accounts inside a game (the player's own login name there) ---------- */

export async function setGameAccount(db: Db, userId: number, gameId: number, username: string) {
  const name = username.trim();
  if (!name || name.length > 60) throw new AppError("invalid", "Enter the player's username in that game (1 to 60 characters).");
  const [g] = await db.select({ id: games.id }).from(games).where(eq(games.id, gameId));
  if (!g) throw new AppError("not_found", "Game not found.", 404);
  await db
    .insert(gameAccounts)
    .values({ userId, gameId, username: name })
    .onConflictDoUpdate({ target: [gameAccounts.userId, gameAccounts.gameId], set: { username: name } });
}

export async function removeGameAccount(db: Db, userId: number, gameId: number) {
  await db.delete(gameAccounts).where(and(eq(gameAccounts.userId, userId), eq(gameAccounts.gameId, gameId)));
}

export async function listGameAccounts(db: Db, userId: number) {
  return db
    .select({ gameId: gameAccounts.gameId, title: games.title, username: gameAccounts.username })
    .from(gameAccounts)
    .innerJoin(games, eq(games.id, gameAccounts.gameId))
    .where(eq(gameAccounts.userId, userId))
    .orderBy(games.title);
}

/* ---------- the game API: what a game's own server can do ---------- */

async function authorise(db: Db, token: string, apiKey: string) {
  if (!token || !apiKey) throw new AppError("unauthorized", "Missing session or API key.", 401);
  const [row] = await db
    .select({ s: gameSessions, game: games, username: users.username })
    .from(gameSessions)
    .innerJoin(games, eq(games.id, gameSessions.gameId))
    .innerJoin(users, eq(users.id, gameSessions.userId))
    .where(eq(gameSessions.token, token));
  // Same answer for "no such session" and "wrong key", so keys cannot be guessed from the response.
  if (!row || row.game.apiKey !== apiKey) throw new AppError("unauthorized", "Unknown session or wrong API key.", 401);
  return row;
}

/** Read a session: who is playing and with how many credits. */
export async function apiSession(db: Db, token: string, apiKey: string) {
  const row = await authorise(db, token, apiKey);
  const [acct] = await db.select({ username: gameAccounts.username }).from(gameAccounts).where(and(eq(gameAccounts.userId, row.s.userId), eq(gameAccounts.gameId, row.game.id)));
  return { status: row.s.status, player: row.username, gameUsername: acct?.username ?? null, stake: row.s.stake, balance: row.s.balance, game: row.game.title };
}

function checkBalance(n: unknown): number {
  if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > MAX_REPORTED_BALANCE) {
    throw new AppError("bad_balance", `balance must be a whole number from 0 to ${MAX_REPORTED_BALANCE}.`);
  }
  return n;
}

/** The game tells us the player's current balance while they play (so the admin can see it). Does not move credits. */
export async function apiReport(db: Db, token: string, apiKey: string, balance: unknown) {
  const row = await authorise(db, token, apiKey);
  if (row.s.status !== "open") throw new AppError("session_closed", "This session is already closed.", 409);
  const b = checkBalance(balance);
  await db.update(gameSessions).set({ balance: b, expiresAt: new Date(Date.now() + EXTERNAL_TTL_MS) }).where(eq(gameSessions.id, row.s.id));
  return { ok: true, balance: b };
}

/** The game says the player has left with `balance` credits: they go back to the wallet and the session closes. */
export async function apiSettle(db: Db, token: string, apiKey: string, balance: unknown) {
  const row = await authorise(db, token, apiKey);
  const b = checkBalance(balance);
  return db.transaction(async (tx) => {
    const t = tx as unknown as Db;
    await t.select({ id: users.id }).from(users).where(eq(users.id, row.s.userId)).for("update");
    const [s] = await t.select().from(gameSessions).where(eq(gameSessions.id, row.s.id));
    if (s.status !== "open") throw new AppError("session_closed", "This session is already closed.", 409); // settling twice never pays twice
    return { ok: true, returned: await closeRow(t, s, b) };
  });
}

export async function regenerateApiKey(db: Db, gameId: number) {
  const key = randomBytes(24).toString("hex");
  const done = await db.update(games).set({ apiKey: key }).where(eq(games.id, gameId)).returning({ id: games.id });
  if (!done.length) throw new AppError("not_found", "Game not found.", 404);
  return key;
}

/** The address a player is sent to for a game on another site, carrying everything that game needs. */
export function buildLaunchUrl(link: string, p: { origin: string; token: string; player: string; gameUsername: string | null; balance: number }): string {
  const u = new URL(link);
  u.searchParams.set("lucky_session", p.token);
  u.searchParams.set("lucky_site", p.origin);
  u.searchParams.set("lucky_player", p.gameUsername ?? p.player);
  u.searchParams.set("lucky_balance", String(p.balance));
  return u.toString();
}
