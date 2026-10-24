import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { promoClaims, promotions } from "@/db/schema";
import { ClaimButton } from "@/components/ClaimButton";
import { fmt } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Promotions" };

export default async function PromotionsPage() {
  const [user, db] = await Promise.all([getCurrentUser(), getDb()]);
  const list = await db.select().from(promotions).where(eq(promotions.active, true)).orderBy(promotions.id);
  const claimed = new Set(user ? (await db.select().from(promoClaims).where(eq(promoClaims.userId, user.id))).map((c) => c.promoId) : []);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Promotions</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {list.map((p) => (
          <article key={p.id} className="card flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold">{p.title}</h2>
              {p.rewardCredits > 0 && <span className="rounded-full bg-gold px-3 py-1 text-xs font-extrabold text-black">+{fmt(p.rewardCredits)}</span>}
            </div>
            <p className="mb-4 mt-2 flex-1 text-sm text-muted">{p.description}</p>
            {p.claimable && p.rewardCredits > 0 ? (
              user ? (
                <ClaimButton url={`/api/promos/${p.code}/claim`} label="Claim reward" disabled={claimed.has(p.id)} doneLabel="Claimed" />
              ) : (
                <Link href="/login" className="btn btn-ghost self-start">Log in to claim</Link>
              )
            ) : p.code === "FRIENDS" ? (
              <Link href="/referral" className="btn btn-violet self-start">Get your link</Link>
            ) : p.code === "VIPCLUB" ? (
              <Link href="/vip" className="btn btn-violet self-start">See VIP tiers</Link>
            ) : null}
          </article>
        ))}
      </div>
      <p className="text-xs text-muted">All rewards are virtual demo credits with no cash value.</p>
    </div>
  );
}
