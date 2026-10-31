"use client";

import { useState } from "react";

/** One message to every player's email. The words stay saved so they can be edited and sent again. */
export function AdminMail({ subject, message, count, enabled }: { subject: string; message: string; count: number; enabled: boolean }) {
  const [s, setS] = useState(subject);
  const [m, setM] = useState(message);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function go(send: boolean) {
    if (send && !window.confirm(`Send this email to ${count} player${count === 1 ? "" : "s"} now?`)) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/mail", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject: s, message: m, send }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send.");
      setMsg({ ok: true, text: send ? `Sent to ${data.sent} player${data.sent === 1 ? "" : "s"}.` : "Saved." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not send." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card max-w-xl space-y-4 p-5">
      <h2 className="font-bold">Email all players</h2>
      <p className="text-sm text-muted">Every player who signed up (with email or Google) is added here by themselves. Right now: <b className="text-ink">{count}</b> email{count === 1 ? "" : "s"}. Suspended accounts and guests are left out.</p>
      {!enabled && <p className="rounded-lg border border-gold/50 p-3 text-sm text-gold">Email is not switched on yet. In Vercel add <code>RESEND_API_KEY</code> and <code>MAIL_FROM</code>, then Redeploy. You can still write and save the message.</p>}
      <label className="block text-sm font-semibold">Subject
        <input className="input mt-1" value={s} maxLength={120} onChange={(e) => setS(e.target.value)} />
      </label>
      <label className="block text-sm font-semibold">Message
        <textarea className="input mt-1 min-h-40" value={m} maxLength={5000} onChange={(e) => setM(e.target.value)} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-ghost" disabled={busy || !s.trim() || !m.trim()} onClick={() => go(false)}>Save</button>
        <button className="btn btn-gold" disabled={busy || !enabled || !s.trim() || !m.trim() || count === 0} onClick={() => go(true)}>{busy ? "Please wait..." : "Send to all"}</button>
        {msg && <span role="status" className={`text-sm font-semibold ${msg.ok ? "text-teal" : "text-danger"}`}>{msg.text}</span>}
      </div>
    </div>
  );
}
