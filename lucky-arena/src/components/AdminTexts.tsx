"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Texts { currency: string; currencyOne: string; msgTopup: string; msgGame: string; msgSignup: string; googleBonus: number }

/** Words and numbers around credits: what they are called, what a player's request says, and the small bonuses. */
export function AdminTexts({ initial }: { initial: Texts }) {
  const router = useRouter();
  const [t, setT] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (k: keyof Texts, v: string | number) => setT({ ...t, [k]: v });

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/texts", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(t) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save.");
      setMsg({ ok: true, text: "Saved." });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not save." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="card max-w-xl space-y-3 p-5">
        <h2 className="font-bold">What credits are called</h2>
        <p className="text-xs text-muted">Used on the spin page, wallet, home, VIP and in the messages the site sends. For example chips, coins or stars.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-muted">Many (plural)<input className="input mt-1" value={t.currency} maxLength={20} onChange={(e) => set("currency", e.target.value)} /></label>
          <label className="block text-xs font-semibold text-muted">One (singular)<input className="input mt-1" value={t.currencyOne} maxLength={20} onChange={(e) => set("currencyOne", e.target.value)} /></label>
        </div>
      </section>

      <section className="card max-w-xl space-y-3 p-5">
        <h2 className="font-bold">Messages you receive</h2>
        <label className="block text-xs font-semibold text-muted">When a player taps + or opens an empty wallet<input className="input mt-1" value={t.msgTopup} maxLength={100} onChange={(e) => set("msgTopup", e.target.value)} /></label>
        <label className="block text-xs font-semibold text-muted">When a player with nothing taps a game<input className="input mt-1" value={t.msgGame} maxLength={100} onChange={(e) => set("msgGame", e.target.value)} />
          <span className="mt-1 block font-normal">Keep <b>{"{game}"}</b> in it: it becomes the game's name.</span>
        </label>
        <label className="block text-xs font-semibold text-muted">When a new player signs up (arrives in your chat by itself)<input className="input mt-1" value={t.msgSignup} maxLength={100} onChange={(e) => set("msgSignup", e.target.value)} />
          <span className="mt-1 block font-normal">Keep <b>{"{game}"}</b> in it: it becomes the game's name.</span>
        </label>
      </section>

      <section className="card max-w-xl space-y-3 p-5">
        <h2 className="font-bold">Bonuses</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-xs font-semibold text-muted">New player who signs up with Google<input type="number" min={0} max={1000} className="input mt-1" value={t.googleBonus} onChange={(e) => set("googleBonus", Number(e.target.value))} /></label>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button className="btn btn-gold" disabled={busy} onClick={save}>Save</button>
        {msg && <span role="status" className={`text-sm font-semibold ${msg.ok ? "text-teal" : "text-danger"}`}>{msg.text}</span>}
      </div>
    </div>
  );
}
