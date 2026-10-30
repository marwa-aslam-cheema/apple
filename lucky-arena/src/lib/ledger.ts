import { and, eq, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { transactions, users } from "@/db/schema";

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

/** Adds (or removes, when negative) credits to the wallet and writes the ledger row. Never lets the balance go below 0. */
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
