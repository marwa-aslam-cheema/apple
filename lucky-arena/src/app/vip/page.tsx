import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db";
import { CREDITS_PER_XP, SPIN_XP } from "@/lib/config";
import { fmt } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";
import { getTexts } from "@/lib/texts";
import { VIP_TIERS, tierForXp } from "@/lib/vip";

export const metadata: Metadata = { title: "VIP Club" };

export default async function VipPage() {
  const user = await getCurrentUser();
  const texts = await getTexts(await getDb());
  const cur = user ? tierForXp(user.xp) : null;
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">VIP Club</h1>
        <p className="mt-1 text-muted">Levels rise slowly: {SPIN_XP} XP for every 50 {texts.currency} you play and 1 XP for every {CREDITS_PER_XP} {texts.currency} you receive. Higher tiers add a little to the daily bonus.</p>
      </header>
      {cur ? (
        <section className="card p-5">
          <p className="text-sm text-muted">Your tier</p>
          <p className="text-2xl font-extrabold text-gold">{cur.tier.name}</p>
          <p className="mb-2 text-sm text-muted">{fmt(user!.xp)} XP{cur.next ? ` · ${fmt(cur.next.minXp - user!.xp)} XP to ${cur.next.name}` : ""}</p>
          <div className="h-3 overflow-hidden rounded-full bg-bg" role="progressbar" aria-valuenow={Math.round(cur.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-gradient-to-r from-violet to-pink" style={{ width: `${cur.progress * 100}%` }} />
          </div>
        </section>
      ) : (
        <p className="card p-5 text-muted"><Link href="/register" className="tap text-gold underline">Sign up</Link> to start earning XP.</p>
      )}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {VIP_TIERS.map((t, i) => (
          <div key={t.name} className={`card p-5 ${cur?.index === i ? "ring-2 ring-gold" : ""}`}>
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold">{t.name}</h2>{cur?.index === i && <span className="rounded-full bg-gold px-2 py-0.5 text-xs font-extrabold text-black">YOU</span>}</div>
            <p className="text-sm text-muted">{fmt(t.minXp)} XP</p>
            <p className="mt-2 text-sm">{t.perk}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
