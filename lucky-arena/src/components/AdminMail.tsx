"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** One message to every player's email, sent from the admin's own Gmail. The words stay saved so they can be edited and sent again. */
export function AdminMail({ subject, message, count, gmail, hasPassword }: { subject: string; message: string; count: number; gmail: string; hasPassword: boolean }) {
  const router = useRouter();
  const [s, setS] = useState(subject);
  const [m, setM] = useState(message);
  const [g, setG] = useState(gmail);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const ready = !!g.trim() && (hasPassword || !!pw.trim());

  async function go(send: boolean) {
    if (send && !window.confirm(`Send this email from ${g} to ${count} player${count === 1 ? "" : "s"} now?`)) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/mail", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject: s, message: m, send, gmail: g, appPassword: pw }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send.");
      setPw("");
      setMsg({ ok: true, text: send ? `Sent to ${data.sent} player${data.sent === 1 ? "" : "s"}.` : "Saved." });
      router.refresh();
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
      <div className="space-y-3 rounded-xl border border-line p-3">
        <p className="text-sm font-semibold">Send from this Gmail</p>
        <label className="block text-xs font-semibold text-muted">Your Gmail
          <input className="input mt-1" type="email" value={g} maxLength={120} placeholder="name@gmail.com" autoComplete="off" onChange={(e) => setG(e.target.value)} />
        </label>
        <label className="block text-xs font-semibold text-muted">App password (16 letters from Google)
          <input className="input mt-1" type="password" value={pw} maxLength={60} autoComplete="new-password" placeholder={hasPassword ? "Saved. Leave empty to keep it." : "abcd efgh ijkl mnop"} onChange={(e) => setPw(e.target.value)} />
          <span className="mt-1 block font-normal">Not your normal Gmail password. Make one at myaccount.google.com/apppasswords (2-step verification must be on). Only you type it here; it is saved scrambled and never shown again.</span>
        </label>
      </div>
      <label className="block text-sm font-semibold">Subject
        <input className="input mt-1" value={s} maxLength={120} onChange={(e) => setS(e.target.value)} />
      </label>
      <label className="block text-sm font-semibold">Message
        <textarea className="input mt-1 min-h-40" value={m} maxLength={5000} onChange={(e) => setM(e.target.value)} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-ghost" disabled={busy} onClick={() => go(false)}>Save</button>
        <button className="btn btn-gold" disabled={busy || !ready || !s.trim() || !m.trim() || count === 0} onClick={() => go(true)}>{busy ? "Please wait..." : "Send to all"}</button>
        {msg && <span role="status" className={`text-sm font-semibold ${msg.ok ? "text-teal" : "text-danger"}`}>{msg.text}</span>}
      </div>
      {!ready && <p className="text-xs text-muted">Type your Gmail and its app password, press Save, then Send to all becomes active.</p>}
    </div>
  );
}
