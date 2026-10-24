import { inArray } from "drizzle-orm";
import type { Db } from "@/db";
import { settings } from "@/db/schema";

export const WALLET_LABEL_DEFAULTS = { topup: "I want a top-up", reward: "Rewards" };
const KEYS = { topup: "wallet_label_topup", reward: "wallet_label_reward" } as const;

/** The names written on the two wallet buttons (the admin can change both). */
export async function getWalletLabels(db: Db) {
  const rows = await db.select().from(settings).where(inArray(settings.key, Object.values(KEYS)));
  const get = (k: string) => rows.find((r) => r.key === k)?.value;
  return { topup: get(KEYS.topup) || WALLET_LABEL_DEFAULTS.topup, reward: get(KEYS.reward) || WALLET_LABEL_DEFAULTS.reward };
}

export async function saveWalletLabels(db: Db, labels: { topup: string; reward: string }) {
  for (const [kind, key] of Object.entries(KEYS)) {
    const value = labels[kind as "topup" | "reward"].trim() || WALLET_LABEL_DEFAULTS[kind as "topup" | "reward"];
    await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
  }
}
