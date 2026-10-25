import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { AdminGameAccounts } from "@/components/AdminGameAccounts";
import { AdminUserActions } from "@/components/AdminUsers";
import { games as gamesTable } from "@/db/schema";
import { AdminSettle } from "@/components/AdminSettle";
import { getOpenSession, listGameAccounts } from "@/lib/game-sessions";
import { eq } from "drizzle-orm";
import { tagList } from "@/lib/tags";
import { fmt, fmtDate } from "@/lib/format";
import { TX_LABELS } from "@/lib/labels";
import { requireAdminPage } from "@/lib/session";
import { userHistory } from "@/lib/services";
import { tierForXp } from "@/lib/vip";

export const metadata: Metadata = { title: "Player history" };

export default async function PlayerHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminPage();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const db = await getDb();
  const h = await userHistory(db, id);
  if (!h) notFound();
  const { user: u, totals } = h;
  const accounts = await listGameAccounts(db, id);
  const inGame = await getOpenSession(db, id);
  const linkGames = (await db.select({ id: gamesTable.id, title: gamesTable.title, link: gamesTable.link }).from(gamesTable).where(eq(gamesTable.active, true))).filter((g) => g.link);
  const tier = tierForXp(u.xp).tier.name;
  const net = totals.won - totals.spent;
  const tiles: [string, string, string?][] = [
    ["Credits now", fmt(u.balance), "text-gold"],
    ["Games played", fmt(totals.plays)],
    ["Credits spent on games", fmt(totals.spent)],
    ["Credits won from games", fmt(totals.won), "text-teal"],
    ["Net from games", `${net >= 0 ? "+" : ""}${fmt(net)}`, net >= 0 ? "text-teal" : "text-danger"],
    ["Added by admin", fmt(totals.addedByAdmin)],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin?tab=users" className="chip hover:border-gold hover:text-ink">&larr; All players</Link>
        <Link href={`/admin?tab=chat&user=${u.id}`} className="chip hover:border-gold hover:text-ink">Open chat</Link>
      </div>

      <section className="card space-y-1 p-5">
        <h1 className="text-2xl font-extrabold">{u.username} {u.banned && <span className="rounded bg-danger px-2 py-0.5 text-sm">banned</span>} {u.role === "admin" && <span className="rounded bg-violet px-2 py-0.5 text-sm">admin</span>} {tagList(u.tag).map((t) => <span key={t} className="rounded-full bg-violet/30 px-2 py-0.5 text-sm">{t}</span>)}</h1>
        <p className="text-ink">{u.email}</p>
        <p className="text-sm text-muted">
          Joined {fmtDate(u.createdAt)} · {tier} VIP ({fmt(u.xp)} XP) · {u.welcomeSpins > 0 ? `${u.welcomeSpins} free welcome spin${u.welcomeSpins === 1 ? "" : "s"} left` : "welcome spins used"}
          {u.lastDailyAt ? ` · last daily bonus ${fmtDate(u.lastDailyAt)}` : ""}
        </p>
        <p className="text-sm text-muted">
          {h.referrer ? <>Joined through <Link className="text-gold underline" href={`/admin/users/${h.referrer.id}`}>{h.referrer.username}</Link>'s invite. </> : "Joined on their own. "}
          {h.referrals.length > 0 ? `Invited ${h.referrals.length} friend${h.referrals.length === 1 ? "" : "s"}: ${h.referrals.map((r) => r.username).join(", ")}.` : "Has not invited anyone yet."}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {tiles.map(([k, v, c]) => (
          <div key={k} className="card p-4"><p className="text-xs text-muted">{k}</p><p className={`text-2xl font-extrabold ${c ?? ""}`}>{v}</p></div>
        ))}
      </section>

      {inGame && (
        <section className="card border-gold/60 p-5">
          <h2 className="mb-3 text-lg font-bold">In a game</h2>
          <AdminSettle userId={u.id} game={inGame.gameTitle} stake={inGame.stake} />
        </section>
      )}

      <section className="card p-5">
        <h2 className="mb-3 text-lg font-bold">Game usernames</h2>
        <AdminGameAccounts userId={u.id} games={linkGames.map((g) => ({ id: g.id, title: g.title }))} accounts={accounts} />
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-lg font-bold">Manage this player</h2>
        <AdminUserActions u={u} self={u.id === admin.id} />
      </section>

      <section className="card overflow-hidden">
        <h2 className="border-b border-line p-4 text-lg font-bold">Games played</h2>
        {h.games.length === 0 ? <p className="p-5 text-sm text-muted">No games played yet.</p> : (
          <ul className="divide-y divide-line">
            {h.games.map((g) => (
              <li key={g.game} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <b>{g.game}</b>
                <span className="text-muted">{g.plays} play{g.plays === 1 ? "" : "s"} · spent <b className="text-ink">{fmt(g.spent)}</b> · won <b className="text-teal">{fmt(g.won)}</b></span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card overflow-hidden">
        <h2 className="border-b border-line p-4 text-lg font-bold">Latest games (newest first)</h2>
        {h.spins.length === 0 ? <p className="p-5 text-sm text-muted">Nothing yet.</p> : (
          <ul className="divide-y divide-line" data-testid="spin-list">
            {h.spins.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <div><b>{s.game}</b> <span className="text-muted">· {s.label}</span><p className="text-xs text-muted">{fmtDate(s.createdAt)}</p></div>
                <div className="text-right">
                  <p className="text-muted">{s.cost > 0 ? `spent ${fmt(s.cost)}` : "free spin"}</p>
                  <p className={s.prize > 0 ? "font-bold text-teal" : "text-muted"}>{s.prize > 0 ? `won ${fmt(s.prize)}` : "no prize"}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card overflow-hidden">
        <h2 className="border-b border-line p-4 text-lg font-bold">Wallet history: where credits came from and went</h2>
        {h.transactions.length === 0 ? <p className="p-5 text-sm text-muted">No transactions.</p> : (
          <ul className="divide-y divide-line" data-testid="tx-history">
            {h.transactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{TX_LABELS[t.type] ?? t.type}{t.note && t.note !== TX_LABELS[t.type] ? ` · ${t.note}` : ""}</p>
                  <p className="text-xs text-muted">{fmtDate(t.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${t.amount >= 0 ? "text-teal" : "text-danger"}`}>{t.amount >= 0 ? "+" : ""}{fmt(t.amount)}</p>
                  <p className="text-xs text-muted">balance {fmt(t.balanceAfter)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
