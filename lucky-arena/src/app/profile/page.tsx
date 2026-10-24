import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { spins } from "@/db/schema";
import { LogoutButton } from "@/components/LogoutButton";
import { fmt, fmtDate } from "@/lib/format";
import { requireUserPage } from "@/lib/session";
import { userStats } from "@/lib/services";
import { tierForXp } from "@/lib/vip";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUserPage();
  const db = await getDb();
  const [stats, recent] = await Promise.all([
    userStats(db, user.id),
    db.select().from(spins).where(eq(spins.userId, user.id)).orderBy(desc(spins.id)).limit(5),
  ]);
  const t = tierForXp(user.xp);
  const tiles: [string, string][] = [
    ["Balance", fmt(user.balance)],
    ["Spins played", fmt(stats.plays)],
    ["Credits won", fmt(stats.won)],
    ["Friends referred", fmt(stats.referrals)],
  ];

  return (
    <div className="space-y-6">
      <section className="card flex flex-wrap items-center gap-4 p-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet to-pink text-2xl font-extrabold" aria-hidden="true">
          {user.username[0].toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-extrabold">{user.username}</h1>
          <p className="truncate text-sm text-muted">{user.email} · joined {user.createdAt.toISOString().slice(0, 10)}</p>
          <span className="mt-1 inline-block rounded-full bg-gold px-2.5 py-0.5 text-xs font-extrabold text-black">{t.tier.name} VIP</span>
        </div>
        <LogoutButton />
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map(([k, v]) => (
          <div key={k} className="card p-4"><p className="text-xs text-muted">{k}</p><p className="text-xl font-extrabold">{v}</p></div>
        ))}
      </section>

      <section className="card p-5">
        <div className="flex items-center justify-between"><h2 className="font-bold">VIP progress</h2><Link href="/vip" className="tap text-sm font-semibold text-gold">Details</Link></div>
        <p className="mb-2 mt-1 text-sm text-muted">{fmt(user.xp)} XP{t.next ? ` · next: ${t.next.name} at ${fmt(t.next.minXp)} XP` : " · top tier"}</p>
        <div className="h-2.5 overflow-hidden rounded-full bg-bg"><div className="h-full rounded-full bg-gradient-to-r from-violet to-pink" style={{ width: `${t.progress * 100}%` }} /></div>
      </section>

      <section className="card p-5">
        <h2 className="mb-2 font-bold">Recent activity</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted">No spins yet. <Link href="/spin" className="tap text-gold underline">Try the wheel</Link>.</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {recent.map((s) => (
              <li key={s.id} className="flex justify-between py-2"><span className="text-muted">{fmtDate(s.createdAt)}</span><span className={s.prize ? "font-bold text-gold" : "text-muted"}>{s.prize ? `+${fmt(s.prize)}` : "No prize"}</span></li>
            ))}
          </ul>
        )}
      </section>
      {user.role === "admin" && <Link href="/admin" className="btn btn-violet">Open admin dashboard</Link>}
    </div>
  );
}
