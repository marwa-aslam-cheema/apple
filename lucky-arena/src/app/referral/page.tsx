import type { Metadata } from "next";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { transactions, users } from "@/db/schema";
import { ReferralCodeEditor } from "@/components/ReferralCodeEditor";
import { CopyLink } from "@/components/CopyLink";
import { ShareKit } from "@/components/ShareKit";
import { REFERRAL_BONUS } from "@/lib/config";
import { fmt } from "@/lib/format";
import { getTexts } from "@/lib/texts";
import { fillCaption, getShare, getSite } from "@/lib/site";
import { requireUserPage } from "@/lib/session";

export const metadata: Metadata = { title: "Referral" };

export default async function ReferralPage() {
  const user = await requireUserPage();
  const db = await getDb();
  const [friends, bonus] = await Promise.all([
    db.select({ username: users.username, createdAt: users.createdAt }).from(users).where(eq(users.referredBy, user.id)).orderBy(desc(users.id)).limit(20),
    db.select({ amount: transactions.amount }).from(transactions).where(and(eq(transactions.userId, user.id), eq(transactions.type, "referral_bonus"))),
  ]);
  const [share, site, texts] = [await getShare(db), await getSite(db), await getTexts(db)];
  const earned = bonus.reduce((t, r) => t + r.amount, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">{share.title}</h1>
        <p className="mt-1 text-muted">{share.intro.replaceAll("{credits}", fmt(REFERRAL_BONUS)).replace(/\bcredits\b/g, texts.currency)}</p>
        {user.role === "admin" && <a href="/admin?tab=site#invite" className="chip mt-2 hover:border-gold">Edit this page and the post</a>}
      </header>
      <section className="card space-y-3 p-5">
        <p className="text-sm text-muted">{share.codeLabel}</p>
        <ReferralCodeEditor code={user.referralCode} url="/api/profile/referral-code" field="code" big />
        <CopyLink code={user.referralCode} base={share.linkBase} />
      </section>
      <section className="card space-y-3 p-5">
        <h2 className="gold-text text-2xl font-extrabold uppercase">Share your invite</h2>
        <ShareKit code={user.referralCode} caption={fillCaption(share.caption, { site: site.name, code: user.referralCode, bonus: share.bonus })} image={share.image} bonus={share.bonus} siteName={site.name} linkBase={share.linkBase} />
      </section>
      <section className="grid grid-cols-2 gap-3">
        <div className="card p-4"><p className="text-xs text-muted">Friends joined</p><p className="text-2xl font-extrabold">{friends.length}</p></div>
        <div className="card p-4"><p className="text-xs text-muted">{texts.currency.charAt(0).toUpperCase() + texts.currency.slice(1)} earned</p><p className="text-2xl font-extrabold text-teal">{fmt(earned)}</p></div>
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
