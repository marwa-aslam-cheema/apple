"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Regular { enabled: boolean; title: string; text: string; button: string; message: string }

/** The "Regular Bonus" offer players see (home page box and popup) after they have claimed the sign-up bonus. */
export function AdminRegularBonus({ regular }: { regular: Regular }) {
  const router = useRouter();
  const [r, setR] = useState(regular);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (k: keyof Regular, v: string | boolean) => setR({ ...r, [k]: v });

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/regular-bonus", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(r) });
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
    <section id="regular" className="card max-w-xl scroll-mt-24 space-y-3 p-5">
      <h2 className="font-bold">Regular Bonus</h2>
      <p className="text-xs text-muted">A player sees the sign-up bonus until they tap its button once. After that the sign-up offer never comes back, and they see this Regular Bonus instead (home page box and popup). Everything written here is yours to change.</p>
      <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-5 w-5 accent-violet" checked={r.enabled} onChange={(e) => set("enabled", e.target.checked)} />Show the Regular Bonus</label>
      <label className="block text-xs font-semibold text-muted">Title<input className="input mt-1" value={r.title} maxLength={40} onChange={(e) => set("title", e.target.value)} /></label>
      <label className="block text-xs font-semibold text-muted">Text<input className="input mt-1" value={r.text} maxLength={160} onChange={(e) => set("text", e.target.value)} /></label>
      <label className="block text-xs font-semibold text-muted">Button<input className="input mt-1" value={r.button} maxLength={30} onChange={(e) => set("button", e.target.value)} /></label>
      <label className="block text-xs font-semibold text-muted">Message that arrives in your chat when the player taps the button<input className="input mt-1" value={r.message} maxLength={100} onChange={(e) => set("message", e.target.value)} /></label>
      <div className="flex items-center gap-3">
        <button className="btn btn-gold" disabled={busy} onClick={save}>Save</button>
        {msg && <span role="status" className={`text-sm font-semibold ${msg.ok ? "text-teal" : "text-danger"}`}>{msg.text}</span>}
      </div>
    </section>
  );
}
