import type { Metadata } from "next";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { transactions, users } from "@/db/schema";
import { CopyLink } from "@/components/CopyLink";
import { ShareKit } from "@/components/ShareKit";
import { REFERRAL_BONUS } from "@/lib/config";
import { fmt } from "@/lib/format";
import { requireUserPage } from "@/lib/session";

export const metadata: Metadata = { title: "Referral" };

export default async function ReferralPage() {
  const user = await requireUserPage();
  const db = await getDb();
  const [friends, bonus] = await Promise.all([
    db.select({ username: users.username, createdAt: users.createdAt }).from(users).where(eq(users.referredBy, user.id)).orderBy(desc(users.id)).limit(20),
    db.select({ amount: transactions.amount }).from(transactions).where(and(eq(transactions.userId, user.id), eq(transactions.type, "referral_bonus"))),
  ]);
  const earned = bonus.reduce((t, r) => t + r.amount, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">Invite friends</h1>
        <p className="mt-1 text-muted">You and each friend who joins with your link both receive {fmt(REFERRAL_BONUS)} demo credits.</p>
      </header>
      <section className="card space-y-3 p-5">
        <p className="text-sm text-muted">Your code</p>
        <p className="text-3xl font-extrabold tracking-widest text-gold" data-testid="ref-code">{user.referralCode}</p>
        <CopyLink code={user.referralCode} />
      </section>
      <section className="card space-y-3 p-5">
        <h2 className="gold-text text-2xl font-extrabold uppercase">Share your invite</h2>
        <ShareKit code={user.referralCode} />
      </section>
      <section className="grid grid-cols-2 gap-3">
        <div className="card p-4"><p className="text-xs text-muted">Friends joined</p><p className="text-2xl font-extrabold">{friends.length}</p></div>
        <div className="card p-4"><p className="text-xs text-muted">Credits earned</p><p className="text-2xl font-extrabold text-teal">{fmt(earned)}</p></div>
      </section>
      <section className="card p-5">
        <h2 className="mb-2 font-bold">Your friends</h2>
        {friends.length === 0 ? <p className="text-sm text-muted">Nobody has joined yet. Share your link!</p> : (
          <ul className="divide-y divide-line text-sm">{friends.map((f) => <li key={f.username} className="flex justify-between py-2"><span>{f.username}</span><span className="text-muted">{f.createdAt.toISOString().slice(0, 10)}</span></li>)}</ul>
        )}
      </section>
    </div>
  );
}
