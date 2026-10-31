import { desc, eq, gte, inArray, and } from "drizzle-orm";
import type { Db } from "@/db";
import { settings, spins, users } from "@/db/schema";
import { SAMPLE_LINES } from "./promo-samples";

export interface PromoPopup { enabled: boolean; title: string; text: string; button: string; buttonMember: string; timerHours: number }
export interface PromoTicker { enabled: boolean; lines: string[]; showWins: boolean; winTemplate: string; minPrize: number }

export const DEFAULT_POPUP: PromoPopup = {
  enabled: true,
  title: "Signup bonus",
  text: "Sign up with Google and get 2 free credits",
  button: "Claim signup bonus",
  buttonMember: "I want a top-up",
  timerHours: 24,
};
/** The offer a player sees after they have claimed the sign-up bonus. Every word of it is the admin's. */
export interface RegularBonus { enabled: boolean; title: string; text: string; button: string; message: string }
export const DEFAULT_REGULAR: RegularBonus = {
  enabled: true,
  title: "Regular Bonus",
  text: "Ask for your regular bonus any time",
  button: "Claim regular bonus",
  message: "I want my regular bonus",
};
const REGULAR_KEY = "promo_regular";

export async function getRegularBonus(db: Db): Promise<RegularBonus> {
  const [row] = await db.select().from(settings).where(eq(settings.key, REGULAR_KEY));
  return parse(row?.value, DEFAULT_REGULAR);
}

export async function saveRegularBonus(db: Db, r: RegularBonus) {
  const value = JSON.stringify(r);
  await db.insert(settings).values({ key: REGULAR_KEY, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
}

export const DEFAULT_TICKER: PromoTicker = {
  enabled: true,
  showWins: false,
  winTemplate: "🎰 {who} won {prize} credits",
  minPrize: 100,
  lines: SAMPLE_LINES,
};

const POPUP_KEY = "promo_popup";
const TICKER_KEY = "promo_ticker";

function parse<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return { ...fallback, ...(JSON.parse(raw) as Partial<T>) };
  } catch {
    return fallback;
  }
}

/** The admin's welcome popup and the scrolling strip's own lines. */
export async function getPromo(db: Db): Promise<{ popup: PromoPopup; ticker: PromoTicker }> {
  const rows = await db.select().from(settings).where(inArray(settings.key, [POPUP_KEY, TICKER_KEY]));
  const get = (k: string) => rows.find((r) => r.key === k)?.value;
  return { popup: parse(get(POPUP_KEY), DEFAULT_POPUP), ticker: parse(get(TICKER_KEY), DEFAULT_TICKER) };
}

export async function savePromo(db: Db, popup: PromoPopup, ticker: PromoTicker) {
  for (const [key, value] of [[POPUP_KEY, JSON.stringify(popup)], [TICKER_KEY, JSON.stringify(ticker)]] as const) {
    await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
  }
}

/** "al..." : enough to recognise yourself, not enough to identify anyone else. */
export function maskName(name: string): string {
  return `${name.slice(0, 2)}...`;
}

/** Real recent wins on the wheel (never invented). Names are partly hidden. */
export async function recentWins(db: Db, limit = 10, minPrize = 100): Promise<{ who: string; prize: number }[]> {
  const rows = await db
    .select({ name: users.username, prize: spins.prize })
    .from(spins)
    .innerJoin(users, eq(users.id, spins.userId))
    .where(and(gte(spins.prize, minPrize), gte(spins.cost, 1)))
    .orderBy(desc(spins.id))
    .limit(limit);
  return rows.map((r) => ({ who: maskName(r.name), prize: r.prize }));
}
