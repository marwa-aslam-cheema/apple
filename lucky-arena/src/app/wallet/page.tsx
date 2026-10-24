import type { Metadata } from "next";
import { getDb } from "@/db";
import { ClaimButton } from "@/components/ClaimButton";
import { RequestCredits } from "@/components/RequestCredits";
import { DAILY_BONUS_BASE, DAILY_COOLDOWN_MS } from "@/lib/config";
import { fmt, fmtDate } from "@/lib/format";
import { requireUserPage } from "@/lib/session";
import { listTransactions, userStats } from "@/lib/services";
import { tierForXp } from "@/lib/vip";

export const metadata: Metadata = { title: "Wallet" };

const LABELS: Record<string, string> = {
  signup_bonus: "Welcome bonus",
  welcome_prize: "Welcome wheel",
  referral_bonus: "Referral bonus",
  spin_cost: "Lucky Spin",
  spin_win: "Spin prize",
  daily_bonus: "Daily bonus",
  promo: "Promotion",
  admin_adjust: "Admin adjustment",
};

export default async function WalletPage() {
  const user = await requireUserPage();
  const db = await getDb();
  const [tx, stats] = await Promise.all([listTransactions(db, user.id, 100), userStats(db, user.id)]);
  const ready = !user.lastDailyAt || Date.now() - user.lastDailyAt.getTime() >= DAILY_COOLDOWN_MS;
  const daily = DAILY_BONUS_BASE + tierForXp(user.xp).tier.dailyBonus;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Wallet</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5 md:col-span-2">
          <p className="text-sm text-muted">Balance</p>
          <p className="mt-1 text-4xl font-extrabold text-gold" data-testid="wallet-balance">{fmt(user.balance)}</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-xl bg-bg p-3"><b className="block text-lg">{fmt(stats.plays)}</b><span className="text-muted">Spins</span></div>
            <div className="rounded-xl bg-bg p-3"><b className="block text-lg text-teal">{fmt(stats.won)}</b><span className="text-muted">Won</span></div>
            <div className="rounded-xl bg-bg p-3"><b className="block text-lg">{fmt(stats.spent)}</b><span className="text-muted">Spent</span></div>
          </div>
        </div>
        <div className="card p-5">
          <h2 className="font-bold">Daily bonus</h2>
          <p className="mb-3 mt-1 text-sm text-muted">Today: {fmt(daily)} credits</p>
          <ClaimButton url="/api/daily" label="Claim now" disabled={!ready} doneLabel="Already claimed" />
        </div>
      </div>

      <section className="card p-5" id="request">
        <h2 className="font-bold">Need more credits?</h2>
        <p className="mb-3 mt-1 text-sm text-muted">Send a request and the admin will answer in your chat.</p>
        <RequestCredits />
      </section>

      <section className="card overflow-hidden">
        <h2 className="border-b border-line p-4 font-bold">Transaction history</h2>
        {tx.length === 0 ? (
          <p className="p-6 text-center text-muted">No transactions yet.</p>
        ) : (
          <ul className="divide-y divide-line" data-testid="tx-list">
            {tx.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{LABELS[t.type] ?? t.type}{t.note && t.note !== LABELS[t.type] ? ` · ${t.note}` : ""}</p>
                  <p className="text-xs text-muted">{fmtDate(t.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${t.amount >= 0 ? "text-teal" : "text-danger"}`}>{t.amount >= 0 ? "+" : ""}{fmt(t.amount)}</p>
                  <p className="text-xs text-muted">bal {fmt(t.balanceAfter)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="text-xs text-muted">Credits are play money: no cash value and no withdrawals.</p>
    </div>
  );
}
