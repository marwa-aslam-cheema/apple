import Link from "next/link";
import { getDb } from "@/db";
import { GameCard } from "@/components/GameCard";
import { VisitorTop } from "@/components/VisitorTop";
import { CasinoBackdrop } from "@/components/CasinoBackdrop";
import { ChipIcon } from "@/components/Logo";
import { MemberBonus } from "@/components/MemberBonus";
import { ClaimButton } from "@/components/ClaimButton";
import { DAILY_COOLDOWN_MS, WELCOME_SPINS } from "@/lib/config";
import { fmt } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";
import { getPromo } from "@/lib/promo";
import { getTexts, unit } from "@/lib/texts";
import { listGameAccounts } from "@/lib/game-sessions";
import { lobbyGames } from "@/lib/services";
import { tierForXp } from "@/lib/vip";

export default async function Home() {
  const [user, db] = await Promise.all([getCurrentUser(), getDb()]);
  const featured = (await lobbyGames(db, { category: "Featured", admin: user?.role === "admin" })).slice(0, 6);
  const accounts = new Set((user ? await listGameAccounts(db, user.id) : []).map((a) => a.gameId));
  const texts = await getTexts(db);
  const dailyReady = !!user && (!user.lastDailyAt || Date.now() - user.lastDailyAt.getTime() >= DAILY_COOLDOWN_MS);
  const tier = user ? tierForXp(user.xp) : null;
  // A player who has used the free welcome spins no longer sees the spin button here; the sign-up bonus (with its countdown from the day they joined) takes its place.
  const spunWelcome = !!user && user.role !== "admin" && user.welcomeSpins === 0;
  const popup = (await getPromo(db)).popup;
  const bonusDeadline = user && popup.timerHours ? user.createdAt.getTime() + popup.timerHours * 3600_000 : 0;
  const showBonus = spunWelcome && popup.enabled && (!popup.timerHours || bonusDeadline > Date.now());
  const needsCredits = !!user && user.role !== "admin" && user.balance === 0 && user.welcomeSpins === 0;

  // Someone without an account: sign in / create account, the signup bonus with its countdown, the strip, then every game.
  if (!user) {
    const all = await lobbyGames(db, {});
    return (
      <div className="relative isolate space-y-8">
        <CasinoBackdrop />
        <VisitorTop />
        <section>
          <h2 className="gold-text mb-3 text-2xl font-extrabold uppercase">Explore games</h2>
          <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-3 lg:grid-cols-5" data-testid="game-grid">
            {all.map((g) => <GameCard key={g.id} game={g} visitor />)}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="relative isolate space-y-10">
      <CasinoBackdrop />
      {showBonus && <MemberBonus title={popup.title} text={popup.text} button={popup.buttonMember} deadline={bonusDeadline} />}

      {/* The big top banner (with its spin button) is for players who still have free spins; afterwards the timed sign-up bonus takes its place. */}
      {!spunWelcome && (
        <section className="marquee relative overflow-hidden bg-gradient-to-br from-[#4a0b26]/80 via-[#1d0b1d]/70 to-[#0d060f]/75 p-8 backdrop-blur-[2px] sm:p-14">
          <div className="spotlight pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 select-none sm:block" aria-hidden="true">
            <span className="float-slow absolute right-24 top-8 text-8xl text-[#b3123f]/70 [--r:-8deg]">♥</span>
            <span className="float-slower absolute right-52 top-28 text-7xl text-gold/50 [--r:10deg]">♠</span>
            <span className="float-slow absolute right-10 top-36 text-7xl text-white/20 [--r:-4deg]">♦</span>
            <span className="float-slower absolute bottom-6 right-36"><ChipIcon size={64} /></span>
            <span className="float-slow absolute bottom-14 right-8"><ChipIcon size={44} /></span>
          </div>
          <div className="relative max-w-xl">
            <p className="neon-text text-xs font-extrabold uppercase tracking-[0.35em]">Casino night</p>
            <h1 className="gold-text mt-3 text-5xl font-extrabold uppercase leading-[1.05] sm:text-7xl">Spin. Play. Shine.</h1>
            <p className="mt-4 text-muted">
              Join free and spin the welcome wheel for your first {texts.currency}, then try the Lucky Spin Wheel with friends.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {user ? (
                <Link href="/spin" className="btn btn-gold">Spin the wheel</Link>
              ) : (
                <Link href="/register" className="btn btn-gold">Join free and spin</Link>
              )}
              <Link href="/games" className="btn btn-ghost">Browse games</Link>
            </div>
          </div>
        </section>
      )}

      {user && (
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="card p-5">
            <h2 className="font-bold">Daily free spin</h2>
            <p className="mb-3 mt-1 text-sm text-muted">Take 1 free spin every day.</p>
            <ClaimButton url="/api/daily" label="Claim free spin" disabled={!dailyReady} doneLabel="Come back later" />
          </div>
          <div className="card p-5">
            <h2 className="font-bold">{tier!.tier.name} member</h2>
            <p className="mb-3 mt-1 text-sm text-muted">{fmt(user.xp)} XP{tier!.next ? ` · ${fmt(tier!.next.minXp - user.xp)} XP to ${tier!.next.name}` : " · top tier reached"}</p>
            <div className="h-2.5 overflow-hidden rounded-full bg-bg" role="progressbar" aria-valuenow={Math.round(tier!.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-gradient-to-r from-violet to-pink" style={{ width: `${tier!.progress * 100}%` }} />
            </div>
            <Link href="/vip" className="tap mt-3 text-sm font-semibold text-gold">See VIP perks</Link>
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="gold-text text-2xl font-extrabold uppercase">Featured games</h2>
          <Link href="/games" className="tap text-sm font-semibold text-gold">View all</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 items-start">
          {featured.map((g) => <GameCard key={g.id} game={g} needsCredits={needsCredits} needsAccount={!!user && user.role !== "admin" && !accounts.has(g.id)} />)}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["1. Join free", `Sign up at zero and take ${WELCOME_SPINS} free spins on the welcome wheel for your first ${texts.currency}.`],
          ["2. Play", `Pick your own bet from 1 to 1,000 ${texts.currency} on the Lucky Spin. Prizes grow with your bet and land in your wallet right away.`],
          ["3. Level up", "Every spin earns XP. Climb the VIP tiers and earn new badges."],
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
