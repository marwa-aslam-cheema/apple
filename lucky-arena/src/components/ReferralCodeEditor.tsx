"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Shows an invite code with a Change button. `url` and `field` decide who is changing it (the player, or the admin for a player). */
export function ReferralCodeEditor({ code, url, field, method = "PATCH", big = false }: { code: string; url: string; field: "code" | "referralCode"; method?: string; big?: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(code);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: text }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save.");
      setEditing(false);
      setMsg({ ok: true, text: "Saved. The invite link now uses the new code." });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not save." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {editing ? (
        <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <input autoFocus className="input w-48 text-lg font-extrabold uppercase tracking-widest" value={text} maxLength={12} aria-label="Invite code" onChange={(e) => setText(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} />
          <button className="btn btn-gold" disabled={busy || text.length < 4}>Save</button>
          <button type="button" className="btn btn-ghost" onClick={() => { setEditing(false); setText(code); setMsg(null); }}>Cancel</button>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <p className={`${big ? "text-3xl" : "text-xl"} font-extrabold tracking-widest text-gold`} data-testid="ref-code">{code}</p>
          <button type="button" className="chip hover:border-gold" onClick={() => { setText(code); setEditing(true); setMsg(null); }}>Change code</button>
        </div>
      )}
      <p className="text-xs text-muted">4 to 12 letters or numbers. Links shared with the old code stop counting for this player.</p>
      {msg && <p role="status" className={`text-sm font-semibold ${msg.ok ? "text-teal" : "text-danger"}`}>{msg.text}</p>}
    </div>
  );
}
