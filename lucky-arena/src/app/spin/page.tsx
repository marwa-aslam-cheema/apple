import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { spins } from "@/db/schema";
import { SpinWheel } from "@/components/SpinWheel";
import { SPIN_COST } from "@/lib/config";
import { fmt, fmtDate } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";
import { activeWheel } from "@/lib/services";

export const metadata: Metadata = { title: "Lucky Spin" };

export default async function SpinPage() {
  const [user, db] = await Promise.all([getCurrentUser(), getDb()]);
  const welcomeLeft = user?.welcomeSpins ?? 0;
  const segments = await activeWheel(db, welcomeLeft > 0 ? "welcome" : "main");
  const recent = user ? await db.select().from(spins).where(eq(spins.userId, user.id)).orderBy(desc(spins.id)).limit(8) : [];
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="gold-text text-4xl font-extrabold uppercase">{welcomeLeft > 0 ? "Welcome Wheel" : "Lucky Spin Wheel"}</h1>
        <p className="mt-1 text-muted">
          {welcomeLeft > 0 ? `${welcomeLeft} free spin${welcomeLeft > 1 ? "s" : ""} left. Small virtual prizes to get you started.` : `${SPIN_COST} demo credits per spin. Virtual prizes only.`}
        </p>
      </div>
      <SpinWheel
        segments={segments.map((s) => ({ id: s.id, label: s.label, credits: s.credits, color: s.color }))}
        cost={SPIN_COST}
        balance={user?.balance ?? 0}
        welcomeLeft={welcomeLeft}
        signedIn={!!user}
      />
      {user && recent.length > 0 && (
        <section className="card mx-auto max-w-md p-4">
          <h2 className="mb-2 font-bold">Your recent spins</h2>
          <ul className="divide-y divide-line text-sm">
            {recent.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2">
                <span className="text-muted">{fmtDate(s.createdAt)}</span>
                <span className={s.prize > 0 ? "font-bold text-gold" : "text-muted"}>{s.prize > 0 ? `+${fmt(s.prize)}` : s.label}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
