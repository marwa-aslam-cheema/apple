import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, eq, ne, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { games, promotions, quickReplies, socialLinks, walletOptions, spins, supportRequests, transactions, users, wheelSegments } from "@/db/schema";
import { AdminWalletLabels } from "@/components/AdminWalletLabels";
import { getWalletLabels } from "@/lib/wallet-labels";
import { AdminGameKeys } from "@/components/AdminGameKeys";
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
  ["replies", "Replies"],
  ["requests", "Requests"],
  ["users", "Users"],
  ["games", "Games"],
  ["promos", "Promotions"],
  ["wheel", "Wheel"],
  ["wallet", "Wallet"],
  ["social", "Social"],
] as const;

const GAME_FIELDS: Field[] = [
  { key: "title", label: "Title", type: "text" },
  { key: "slug", label: "Slug", type: "text" },
  { key: "category", label: "Category", type: "select", options: ["Wheel", "Cards", "Arcade", "Puzzle", "Trivia"] },
  { key: "description", label: "Description", type: "text" },
  { key: "link", label: "Game link (https://...)", type: "text" },
  { key: "adminLink", label: "Admin link: the game's own back-office (only you see it; never share its password here)", type: "text" },
  { key: "image", label: "Game picture (pick a file from your phone or computer)", type: "gameimage" },
  { key: "hue", label: "Colour hue (0-360)", type: "number" },
  { key: "sortOrder", label: "Sort order", type: "number" },
  { key: "featured", label: "Featured", type: "bool" },
  { key: "playable", label: "Playable (opens Lucky Spin)", type: "bool" },
  { key: "active", label: "Visible", type: "bool" },
];
const PROMO_FIELDS: Field[] = [
  { key: "title", label: "Title", type: "text" },
  { key: "code", label: "Code", type: "text" },
  { key: "description", label: "Description", type: "textarea" },
  { key: "rewardCredits", label: "Reward credits", type: "number" },
  { key: "claimable", label: "Claimable once", type: "bool" },
  { key: "active", label: "Visible", type: "bool" },
];
const REPLY_FIELDS: Field[] = [
  { key: "title", label: "Button title (short)", type: "text" },
  { key: "body", label: "Message", type: "textarea" },
  { key: "shortcut", label: "Shortcut (optional: type it in the chat box to fill this message)", type: "text" },
  { key: "imageId", label: "Picture sent with this reply (optional)", type: "picture" },
  { key: "sortOrder", label: "Order", type: "number" },
];
const WALLET_FIELDS: Field[] = [
  { key: "kind", label: "Shows under", type: "select", options: ["topup", "reward"] },
  { key: "title", label: "Title", type: "text" },
  { key: "description", label: "Text (write anything you like)", type: "textarea" },
  { key: "code", label: "Code (short, optional: the player gets a Copy button and sends it to you in the chat)", type: "text" },
  { key: "image", label: "Picture (optional: pick a file)", type: "gameimage" },
  { key: "sortOrder", label: "Order", type: "number" },
  { key: "active", label: "Visible", type: "bool" },
];
const SOCIAL_FIELDS: Field[] = [
  { key: "kind", label: "Network", type: "select", options: ["Facebook", "WhatsApp", "Instagram", "Telegram", "TikTok", "YouTube", "Other"] },
  { key: "label", label: "Name shown to players (optional, e.g. Lucky Arena Page)", type: "text" },
  { key: "url", label: "Link (https://...  WhatsApp: https://wa.me/1234567890)", type: "text" },
  { key: "sortOrder", label: "Order", type: "number" },
  { key: "active", label: "Visible", type: "bool" },
];
const WHEEL_FIELDS: Field[] = [
  { key: "label", label: "Label", type: "text" },
  { key: "credits", label: "Prize at a 50-credit bet (main wheel shows it as a multiplier: 100 = 2x)", type: "number" },
  { key: "kind", label: "Wheel (main = paid spins, welcome = free first spins)", type: "select", options: ["main", "welcome"] },
  { key: "icon", label: "Icon (an emoji, e.g. a slot machine)", type: "text" },
  { key: "weight", label: "Weight (chance)", type: "number" },
  { key: "color", label: "Colour", type: "color" },
  { key: "sortOrder", label: "Order", type: "number" },
  { key: "active", label: "Active", type: "bool" },
];

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; user?: string }> }) {
  const admin = await requireAdminPage();
  const { tab = "overview", q = "", user: userParam } = await searchParams;
  const db = await getDb();

  const [{ open }] = await db.select({ open: count() }).from(supportRequests).where(eq(supportRequests.status, "open"));

  const unreadChat = await adminUnreadCount(db);

  let body: React.ReactNode;
  if (tab === "chat") {
    const target = Number(userParam);
    const [who] = Number.isInteger(target) && target > 0 ? await db.select({ id: users.id, username: users.username, email: users.email }).from(users).where(eq(users.id, target)) : [];
    body = <AdminChat initial={who ? { userId: who.id, username: who.username, email: who.email } : undefined} />;
  } else if (tab === "wallet") {
    const rows = await db.select().from(walletOptions).orderBy(walletOptions.sortOrder, walletOptions.id);
    const labels = await getWalletLabels(db);
    body = (
      <div className="space-y-4">
        <AdminWalletLabels topup={labels.topup} reward={labels.reward} />
        <p className="card p-4 text-sm">The wallet page has two buttons (you can rename them above). Each opens the cards below: "Shows under" topup or reward. Edit the title and text, add a picture, add new cards or delete them. When a player taps a card, you get it in the chat (for example "I need a top-up: 500 credits").</p>
        <AdminResource resource="wallet" titleKey="title" fields={WALLET_FIELDS} rows={rows} defaults={{ kind: "topup", title: "", description: "", code: "", image: "", sortOrder: rows.length, active: true }} />
      </div>
    );
  } else if (tab === "social") {
    const rows = await db.select().from(socialLinks).orderBy(socialLinks.sortOrder, socialLinks.id);
    body = (
      <div className="space-y-4">
        <p className="card p-4 text-sm">Add your Facebook page, WhatsApp, Instagram and other accounts. Players see them in the chat window and in the side menu. Untick "Visible" to hide one, or delete it to remove it.</p>
        <AdminResource resource="social" titleKey="kind" fields={SOCIAL_FIELDS} rows={rows} defaults={{ kind: "Facebook", label: "", url: "", sortOrder: rows.length, active: true }} />
      </div>
    );
  } else if (tab === "replies") {
    const rows = await db.select().from(quickReplies).orderBy(quickReplies.sortOrder, quickReplies.id);
    body = (
      <div className="space-y-4">
        <p className="card p-4 text-sm">Quick replies appear as buttons above the message box in the admin chat. Click one to fill the box, then press Send. Give a reply a shortcut (for example ok) and typing just that word in the chat box fills the whole message. You can also type a message in the chat and press "Save as quick reply". Open a reply below to add, change or remove its picture: replies with a picture show a paperclip on their button, and the picture goes out together with the text (also when you use the shortcut).</p>
        <AdminResource resource="replies" titleKey="title" fields={REPLY_FIELDS} rows={rows.map((r) => ({ ...r, imageId: r.imageId ?? 0 }))} defaults={{ title: "", body: "", shortcut: "", imageId: 0, sortOrder: rows.length }} />
      </div>
    );
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
    const term = q.trim().slice(0, 60);
    const list = await db
      .select({ id: users.id, username: users.username, email: users.email, role: users.role, balance: users.balance, banned: users.banned, tag: users.tag, createdAt: users.createdAt })
      .from(users)
      .where(term ? and(ne(users.role, "guest"), sql`(${users.email} ilike ${"%" + term.replace(/[%_]/g, "") + "%"} or ${users.username} ilike ${"%" + term.replace(/[%_]/g, "") + "%"})`) : ne(users.role, "guest"))
      .orderBy(desc(users.id))
      .limit(200);
    body = (
      <div className="space-y-4">
        <form action="/admin" method="get" className="flex gap-2">
          <input type="hidden" name="tab" value="users" />
          <input name="q" defaultValue={term} placeholder="Search by email or username" aria-label="Search players" className="input" />
          <button className="btn btn-gold">Search</button>
          {term && <Link href="/admin?tab=users" className="btn btn-ghost">Clear</Link>}
        </form>
        <p className="text-sm text-muted">{list.length} player{list.length === 1 ? "" : "s"}{term ? ` matching "${term}"` : " (newest first)"}. Each card shows the email and credits, a History link (games played and where credits went), and a password reset.</p>
        <AdminUsers users={list.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))} selfId={admin.id} />
      </div>
    );
  } else if (tab === "games") {
    const rows = await db.select().from(games).orderBy(games.sortOrder, games.id);
    body = (<div className="space-y-6"><AdminGameKeys rows={rows.map((r) => ({ id: r.id, title: r.title, apiKey: r.apiKey, link: r.link }))} /><AdminResource resource="games" titleKey="title" fields={GAME_FIELDS} rows={rows} defaults={{ title: "", slug: "", category: "Arcade", description: "", link: "", adminLink: "", image: "", hue: 260, sortOrder: 0, featured: false, playable: false, active: true }} /></div>);
  } else if (tab === "promos") {
    const rows = (await db.select().from(promotions).orderBy(promotions.id)).map(({ createdAt: _c, ...r }) => r);
    body = <AdminResource resource="promos" titleKey="title" fields={PROMO_FIELDS} rows={rows} defaults={{ title: "", code: "", description: "", rewardCredits: 100, claimable: true, active: true }} />;
  } else if (tab === "wheel") {
    const rows = await db.select().from(wheelSegments).orderBy(wheelSegments.sortOrder, wheelSegments.id);
    const rtp = expectedReturn(rows.filter((r) => r.active && r.kind === "main"), SPIN_COST);
    body = (
      <div className="space-y-4">
        <p className="card p-4 text-sm">Expected return per paid spin on the main wheel: <b className="text-gold">{(rtp * 100).toFixed(1)}%</b> of the {SPIN_COST} credit cost. Above 100% means the demo economy inflates over time. Keep at least 2 active segments with weight above 0.</p>
        <AdminResource resource="wheel" titleKey="label" fields={WHEEL_FIELDS} rows={rows} defaults={{ label: "", credits: 0, weight: 10, kind: "main", icon: "", color: "#7c5cff", sortOrder: rows.length, active: true }} />
      </div>
    );
  } else {
    const [[u], [s], [t], segs] = await Promise.all([
      db.select({ n: count(), credits: sql<number>`coalesce(sum(${users.balance}), 0)::int` }).from(users).where(ne(users.role, "guest")),
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
