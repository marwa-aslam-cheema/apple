import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { settings } from "@/db/schema";
import { DAILY_BONUS_BASE, GOOGLE_SIGNUP_BONUS } from "./config";

/** Words and numbers the admin can change without touching the code. */
export interface SiteTexts {
  currency: string; // what the money-like points are called, plural ("credits")
  currencyOne: string; // singular ("credit")
  msgTopup: string; // sent to the admin when a player asks for more
  msgGame: string; // sent when a player with nothing taps a game; {game} is the game's name
  msgSignup: string; // sent to the admin the moment a new player signs up
  dailyBase: number; // the daily bonus
  dailyExtra: number; // added from the second daily claim at Gold level and above
  googleBonus: number; // credits for a new player who signs up with Google
}

export const DEFAULT_TEXTS: SiteTexts = {
  currency: "credits",
  currencyOne: "credit",
  msgTopup: "I need a top-up",
  msgGame: "I want credits in {game}",
  msgSignup: "I want 150% signup bonus",
  dailyBase: DAILY_BONUS_BASE,
  dailyExtra: 1,
  googleBonus: GOOGLE_SIGNUP_BONUS,
};

const KEY = "site_texts";

export async function getTexts(db: Db): Promise<SiteTexts> {
  const [row] = await db.select().from(settings).where(eq(settings.key, KEY));
  if (!row) return DEFAULT_TEXTS;
  try {
    return { ...DEFAULT_TEXTS, ...(JSON.parse(row.value) as Partial<SiteTexts>) };
  } catch {
    return DEFAULT_TEXTS;
  }
}

export async function saveTexts(db: Db, t: SiteTexts) {
  await db.insert(settings).values({ key: KEY, value: JSON.stringify(t) }).onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(t) } });
}

/** "1 credit", "5 credits" in the admin's own word. */
export function unit(n: number, t: Pick<SiteTexts, "currency" | "currencyOne">): string {
  return n === 1 ? t.currencyOne : t.currency;
}

/** The daily bonus for this player today. The level part is added only from the second claim, at Gold level and above. */
export function dailyReward(t: SiteTexts, p: { claimedBefore: boolean; levelBonus: number }): number {
  return t.dailyBase + (p.claimedBefore && p.levelBonus > 0 ? t.dailyExtra : 0);
}
