import Link from "next/link";
import { getDb } from "@/db";
import { GameCard } from "@/components/GameCard";
import { ClaimButton } from "@/components/ClaimButton";
import { DAILY_BONUS_BASE, DAILY_COOLDOWN_MS, SPIN_COST, WELCOME_SPINS } from "@/lib/config";
import { fmt } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";
import { lobbyGames } from "@/lib/services";
import { tierForXp } from "@/lib/vip";

export default async function Home() {
  const [user, db] = await Promise.all([getCurrentUser(), getDb()]);
  const featured = (await lobbyGames(db, { category: "Featured" })).slice(0, 6);
  const dailyReady = !!user && (!user.lastDailyAt || Date.now() - user.lastDailyAt.getTime() >= DAILY_COOLDOWN_MS);
  const tier = user ? tierForXp(user.xp) : null;

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-violet/40 via-surface to-pink/20 p-6 sm:p-10">
        <div className="max-w-xl">
          <p className="mb-2 inline-block rounded-full bg-gold px-3 py-1 text-xs font-extrabold text-black">DEMO CREDITS ONLY</p>
          <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">
            Spin, play and climb the <span className="text-gold">VIP ladder</span>
          </h1>
          <p className="mt-3 text-muted">
            A friendly prototype lobby. Join free and spin the welcome wheel for your first virtual credits, then try the Lucky Spin Wheel. Nothing here costs or pays real money.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {user ? (
              <Link href="/spin" className="btn btn-gold">Spin the wheel</Link>
            ) : (
              <Link href="/register" className="btn btn-gold">Join free and spin</Link>
            )}
            <Link href="/games" className="btn btn-ghost">Browse games</Link>
          </div>
        </div>
        <svg aria-hidden="true" viewBox="0 0 200 200" className="pointer-events-none absolute -right-10 -top-10 hidden h-72 w-72 opacity-40 sm:block">
          <circle cx="100" cy="100" r="90" fill="none" stroke="#f5b942" strokeWidth="4" strokeDasharray="10 8" />
          <circle cx="100" cy="100" r="60" fill="none" stroke="#7c5cff" strokeWidth="6" />
        </svg>
      </section>

      {user && (
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="card p-5">
            <h2 className="font-bold">Daily bonus</h2>
            <p className="mb-3 mt-1 text-sm text-muted">Collect at least {DAILY_BONUS_BASE} credits every day. VIP tiers add more.</p>
            <ClaimButton url="/api/daily" label="Claim daily bonus" disabled={!dailyReady} doneLabel="Come back later" />
          </div>
          <div className="card p-5">
            <h2 className="font-bold">{tier!.tier.name} member</h2>
            <p className="mb-3 mt-1 text-sm text-muted">{fmt(user.xp)} XP{tier!.next ? ` · ${fmt(tier!.next.minXp - user.xp)} XP to ${tier!.next.name}` : " · top tier reached"}</p>
            <div className="h-2.5 overflow-hidden rounded-full bg-bg" role="progressbar" aria-valuenow={Math.round(tier!.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-gradient-to-r from-violet to-pink" style={{ width: `${tier!.progress * 100}%` }} />
            </div>
            <Link href="/vip" className="mt-3 inline-block text-sm font-semibold text-gold">See VIP perks</Link>
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-xl font-extrabold">Featured games</h2>
          <Link href="/games" className="text-sm font-semibold text-gold">View all</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {featured.map((g) => <GameCard key={g.id} game={g} />)}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["1. Join free", `Sign up at zero and take ${WELCOME_SPINS} free spins on the welcome wheel for your first credits.`],
          ["2. Play", `Each Lucky Spin costs ${SPIN_COST} credits. Prizes are added to your wallet right away.`],
          ["3. Level up", "Every spin earns XP. Higher VIP tiers unlock bigger daily bonuses."],
        ].map(([t, d]) => (
          <div key={t} className="card p-5">
            <h3 className="font-bold text-gold">{t}</h3>
            <p className="mt-1 text-sm text-muted">{d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
