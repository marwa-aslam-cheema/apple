import type { Metadata } from "next";
import Link from "next/link";
import { count, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { games, promotions, spins, supportRequests, transactions, users, wheelSegments } from "@/db/schema";
import { AdminResource, type Field } from "@/components/AdminResource";
import { AdminChat } from "@/components/AdminChat";
import { AdminRequests } from "@/components/AdminRequests";
import { AdminUsers } from "@/components/AdminUsers";
import { SPIN_COST } from "@/lib/config";
import { fmt } from "@/lib/format";
import { requireAdminPage } from "@/lib/session";
import { adminUnreadCount } from "@/lib/services";
import { expectedReturn } from "@/lib/wheel";

export const metadata: Metadata = { title: "Admin" };

const TABS = [
  ["overview", "Overview"],
  ["chat", "Chat"],
  ["requests", "Requests"],
  ["users", "Users"],
  ["games", "Games"],
  ["promos", "Promotions"],
  ["wheel", "Wheel"],
] as const;

const GAME_FIELDS: Field[] = [
  { key: "title", label: "Title", type: "text" },
  { key: "slug", label: "Slug", type: "text" },
  { key: "category", label: "Category", type: "select", options: ["Wheel", "Cards", "Arcade", "Puzzle", "Trivia"] },
  { key: "description", label: "Description", type: "text" },
  { key: "link", label: "Game link (https://...)", type: "text" },
  { key: "image", label: "Picture link (https://... .png/.jpg)", type: "text" },
  { key: "hue", label: "Colour hue (0-360)", type: "number" },
  { key: "sortOrder", label: "Sort order", type: "number" },
  { key: "featured", label: "Featured", type: "bool" },
  { key: "playable", label: "Playable (opens Lucky Spin)", type: "bool" },
  { key: "active", label: "Visible", type: "bool" },
];
const PROMO_FIELDS: Field[] = [
  { key: "title", label: "Title", type: "text" },
  { key: "code", label: "Code", type: "text" },
  { key: "description", label: "Description", type: "text" },
  { key: "rewardCredits", label: "Reward credits", type: "number" },
  { key: "claimable", label: "Claimable once", type: "bool" },
  { key: "active", label: "Visible", type: "bool" },
];
const WHEEL_FIELDS: Field[] = [
  { key: "label", label: "Label", type: "text" },
  { key: "credits", label: "Prize credits", type: "number" },
  { key: "kind", label: "Wheel (main = paid spins, welcome = free first spins)", type: "select", options: ["main", "welcome"] },
  { key: "weight", label: "Weight (chance)", type: "number" },
  { key: "color", label: "Colour", type: "color" },
  { key: "sortOrder", label: "Order", type: "number" },
  { key: "active", label: "Active", type: "bool" },
];

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const admin = await requireAdminPage();
  const { tab = "overview" } = await searchParams;
  const db = await getDb();

  const [{ open }] = await db.select({ open: count() }).from(supportRequests).where(eq(supportRequests.status, "open"));

  const unreadChat = await adminUnreadCount(db);

  let body: React.ReactNode;
  if (tab === "chat") {
    body = <AdminChat />;
  } else if (tab === "requests") {
    const rows = await db
      .select({ id: supportRequests.id, identifier: supportRequests.identifier, userId: supportRequests.userId, username: users.username, email: users.email, status: supportRequests.status, createdAt: supportRequests.createdAt })
      .from(supportRequests)
      .leftJoin(users, eq(users.id, supportRequests.userId))
      .where(eq(supportRequests.status, "open"))
      .orderBy(desc(supportRequests.id))
      .limit(100);
    body = <AdminRequests rows={rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))} />;
  } else if (tab === "users") {
    const list = await db
      .select({ id: users.id, username: users.username, email: users.email, role: users.role, balance: users.balance, banned: users.banned })
      .from(users).orderBy(desc(users.id)).limit(200);
    body = <AdminUsers users={list} selfId={admin.id} />;
  } else if (tab === "games") {
    const rows = await db.select().from(games).orderBy(games.sortOrder, games.id);
    body = <AdminResource resource="games" titleKey="title" fields={GAME_FIELDS} rows={rows} defaults={{ title: "", slug: "", category: "Arcade", description: "", link: "", image: "", hue: 260, sortOrder: 0, featured: false, playable: false, active: true }} />;
  } else if (tab === "promos") {
    const rows = (await db.select().from(promotions).orderBy(promotions.id)).map(({ createdAt: _c, ...r }) => r);
    body = <AdminResource resource="promos" titleKey="title" fields={PROMO_FIELDS} rows={rows} defaults={{ title: "", code: "", description: "", rewardCredits: 100, claimable: true, active: true }} />;
  } else if (tab === "wheel") {
    const rows = await db.select().from(wheelSegments).orderBy(wheelSegments.sortOrder, wheelSegments.id);
    const rtp = expectedReturn(rows.filter((r) => r.active && r.kind === "main"), SPIN_COST);
    body = (
      <div className="space-y-4">
        <p className="card p-4 text-sm">Expected return per paid spin on the main wheel: <b className="text-gold">{(rtp * 100).toFixed(1)}%</b> of the {SPIN_COST} credit cost. Above 100% means the demo economy inflates over time. Keep at least 2 active segments with weight above 0.</p>
        <AdminResource resource="wheel" titleKey="label" fields={WHEEL_FIELDS} rows={rows} defaults={{ label: "", credits: 0, weight: 10, kind: "main", color: "#7c5cff", sortOrder: rows.length, active: true }} />
      </div>
    );
  } else {
    const [[u], [s], [t], segs] = await Promise.all([
      db.select({ n: count(), credits: sql<number>`coalesce(sum(${users.balance}), 0)::int` }).from(users),
      db.select({ n: count(), cost: sql<number>`coalesce(sum(${spins.cost}), 0)::int`, prize: sql<number>`coalesce(sum(${spins.prize}), 0)::int` }).from(spins),
      db.select({ n: count() }).from(transactions),
      db.select().from(wheelSegments),
    ]);
    const actual = s.cost ? (s.prize / s.cost) * 100 : 0;
    const tiles: [string, string][] = [
      ["Players", fmt(u.n)],
      ["Credits in circulation", fmt(u.credits)],
      ["Spins played", fmt(s.n)],
      ["Transactions", fmt(t.n)],
      ["Actual return", s.cost ? `${actual.toFixed(1)}%` : "n/a"],
      ["Expected return", `${(expectedReturn(segs.filter((x) => x.active && x.kind === "main"), SPIN_COST) * 100).toFixed(1)}%`],
    ];
    body = <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{tiles.map(([k, v]) => <div key={k} className="card p-4"><p className="text-xs text-muted">{k}</p><p className="text-2xl font-extrabold">{v}</p></div>)}</div>;
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Admin dashboard</h1>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4" role="tablist">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`/admin?tab=${k}`} className="chip" role="tab" aria-selected={tab === k} aria-current={tab === k ? "true" : undefined}>{label}{k === "requests" && open > 0 ? ` (${open})` : ""}{k === "chat" && unreadChat > 0 ? ` (${unreadChat})` : ""}</Link>
        ))}
      </div>
      {body}
    </div>
  );
}
