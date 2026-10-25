"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Popup { enabled: boolean; title: string; text: string; button: string; buttonMember: string; timerHours: number }

/** The welcome popup and the scrolling strip under the top bar. */
export function AdminPromo({ popup, tickerEnabled, tickerLines }: { popup: Popup; tickerEnabled: boolean; tickerLines: string[] }) {
  const router = useRouter();
  const [p, setP] = useState(popup);
  const [te, setTe] = useState(tickerEnabled);
  const [lines, setLines] = useState(tickerLines.join("\n"));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (k: keyof Popup, v: string | boolean | number) => setP({ ...p, [k]: v });

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const list = lines.split("\n").map((l) => l.trim()).filter(Boolean);
      const res = await fetch("/api/admin/promo", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ popup: p, ticker: { enabled: te, lines: list } }) });
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
        <h2 className="font-bold">Welcome popup</h2>
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-5 w-5 accent-violet" checked={p.enabled} onChange={(e) => set("enabled", e.target.checked)} />Show the popup (once per visit)</label>
        <label className="block text-xs font-semibold text-muted">Title<input className="input mt-1" value={p.title} maxLength={40} onChange={(e) => set("title", e.target.value)} /></label>
        <label className="block text-xs font-semibold text-muted">Text<input className="input mt-1" value={p.text} maxLength={160} onChange={(e) => set("text", e.target.value)} /></label>
        <label className="block text-xs font-semibold text-muted">Button for visitors without an account (opens Sign up)<input className="input mt-1" value={p.button} maxLength={30} onChange={(e) => set("button", e.target.value)} /></label>
        <label className="block text-xs font-semibold text-muted">Button for players who already have an account (sends "I need a top-up" to your chat)<input className="input mt-1" value={p.buttonMember} maxLength={30} onChange={(e) => set("buttonMember", e.target.value)} /></label>
        <label className="block text-xs font-semibold text-muted">Countdown on the home page for visitors, in hours (0 = no countdown)<input type="number" min={0} max={720} className="input mt-1 w-32" value={p.timerHours} onChange={(e) => set("timerHours", Number(e.target.value))} /></label>
        <p className="text-xs text-muted">The countdown starts when a visitor first opens the site (on their own phone) and counts down honestly. When it ends the card says the offer has ended.</p>
      </section>
      <section className="card max-w-xl space-y-3 p-5">
        <h2 className="font-bold">Scrolling strip under the top bar</h2>
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-5 w-5 accent-violet" checked={te} onChange={(e) => setTe(e.target.checked)} />Show the strip</label>
        <label className="block text-xs font-semibold text-muted">Your lines (one per line, up to 30)
          <textarea className="input mt-1 min-h-32" value={lines} onChange={(e) => setLines(e.target.value)} />
        </label>
        <p className="text-xs text-muted">The strip mixes your lines with the real recent wins on the Lucky Wheel (for example "al... won 150 credits", names half hidden). Up to 20 items run in a random order each time the page opens. Only real wins are shown, nothing is made up.</p>
      </section>
      <div className="flex items-center gap-3">
        <button className="btn btn-gold" disabled={busy} onClick={save}>Save</button>
        {msg && <span role="status" className={`text-sm font-semibold ${msg.ok ? "text-teal" : "text-danger"}`}>{msg.text}</span>}
      </div>
    </div>
  );
}
