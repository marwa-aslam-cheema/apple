"use client";

import { useEffect, useState } from "react";
import { QuickReplies } from "./QuickReplies";

/** Write one message and send it to every player's chat (promotions, announcements). Asks to confirm first. */
export function BroadcastPanel({ onClose }: { onClose: () => void }) {
  const [recipients, setRecipients] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/chat/broadcast", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d && setRecipients(d.recipients))
      .catch(() => undefined);
    return () => { alive = false; };
  }, []);

  async function send() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/chat/broadcast", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: text }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send.");
      setMsg({ ok: true, text: `Sent to ${data.sent} player${data.sent === 1 ? "" : "s"}.` });
      setText("");
      window.dispatchEvent(new Event("la:chat-refresh"));
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not send." });
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  const n = recipients ?? 0;
  return (
    <div className="flex h-full flex-col">
      <h2 className="flex items-center gap-2 border-b border-line p-3 text-sm font-bold">
        <button className="rounded-lg px-2 py-1 hover:bg-surface-2" onClick={onClose} aria-label="Back to conversations">&larr;</button>
        Send to all players
      </h2>
      <QuickReplies onPick={(t) => { setText(t); setConfirming(false); }} />
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        <p className="text-xs text-muted">
          This message goes into every player's chat at once{recipients !== null ? ` (${recipients} player${recipients === 1 ? "" : "s"}; admins and banned accounts are skipped)` : ""}. They get the usual new-message alert. Replies come back to you one by one in the list.
        </p>
        <label className="block text-xs font-semibold text-muted">Message
          <textarea className="input mt-1 min-h-32 resize-y whitespace-pre-wrap" rows={6} maxLength={1000} value={text} onChange={(e) => { setText(e.target.value); setConfirming(false); }} placeholder="For example: Weekend promo! Spin the wheel twice today." />
        </label>
        {confirming ? (
          <div className="space-y-2 rounded-xl border border-gold/60 bg-surface-2 p-3">
            <p className="text-sm font-semibold">Send this to {n} player{n === 1 ? "" : "s"}? It cannot be taken back.</p>
            <div className="flex gap-2">
              <button className="btn btn-gold" disabled={busy} onClick={send}>{busy ? "Sending..." : "Yes, send to all"}</button>
              <button className="btn btn-ghost" disabled={busy} onClick={() => setConfirming(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button className="btn btn-gold" disabled={!text.trim() || n === 0} onClick={() => setConfirming(true)}>Send to all</button>
        )}
        {msg && <p role="status" className={`text-sm font-semibold ${msg.ok ? "text-teal" : "text-danger"}`}>{msg.text}</p>}
      </div>
    </div>
  );
}
