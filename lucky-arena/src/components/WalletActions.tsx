"use client";

import { useEffect, useState } from "react";

interface Option { id: number; kind: "topup" | "reward"; title: string; description: string; code: string; image: string }

/** "I want a top-up" and "Rewards": each opens the cards the admin wrote; tapping a card sends it to the admin's chat. */
export function WalletActions() {
  const [items, setItems] = useState<Option[]>([]);
  const [labels, setLabels] = useState({ topup: "I want a top-up", reward: "Rewards" });
  const [open, setOpen] = useState<"topup" | "reward" | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  async function copy(o: Option) {
    try {
      await navigator.clipboard.writeText(o.code);
    } catch {
      const t = document.createElement("textarea"); // older browsers: select and copy by hand
      t.value = o.code;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopied(o.id);
    setTimeout(() => setCopied((c) => (c === o.id ? null : c)), 1800);
  }

  useEffect(() => {
    const load = () => fetch("/api/wallet-options", { cache: "no-store" }).then((r) => r.json()).then((d) => { setItems(d.items ?? []); if (d.labels) setLabels(d.labels); }).catch(() => undefined);
    void load();
    window.addEventListener("la:content-changed", load); // the admin edited the cards
    return () => window.removeEventListener("la:content-changed", load);
  }, []);

  async function choose(o: Option) {
    setBusy(o.id);
    setNote("");
    try {
      const res = await fetch("/api/wallet-options/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: o.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send.");
      setNote(data.sent ? `Sent: ${o.title}. The admin will answer in your chat.` : "You already asked for this. The admin will answer in your chat.");
      window.dispatchEvent(new Event("la:open-chat"));
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Could not send.");
    } finally {
      setBusy(null);
    }
  }

  const shown = items.filter((i) => i.kind === open);
  const tabs: [("topup" | "reward"), string][] = [["topup", labels.topup], ["reward", labels.reward]];

  return (
    <section className="card space-y-4 p-5" id="request">
      <div className="grid grid-cols-2 gap-3">
        {tabs.map(([k, label]) => (
          <button key={k} type="button" aria-expanded={open === k} onClick={() => { setOpen(open === k ? null : k); setNote(""); }} className={`btn ${k === "topup" ? "btn-gold" : "btn-violet"} w-full ${open === k ? "ring-2 ring-white/60" : ""}`}>
            {label}
          </button>
        ))}
      </div>
      {open && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label={open === "topup" ? "Top-up options" : "Reward options"}>
          {shown.length === 0 && <li className="col-span-full text-center text-sm text-muted">Nothing here yet. Ask the admin in the chat.</li>}
          {shown.map((o) => (
            <li key={o.id} className="card flex flex-col overflow-hidden p-0">
              <button type="button" disabled={busy === o.id} onClick={() => void choose(o)} className="block w-full flex-1 text-left transition-colors hover:bg-surface-2">
                {o.image && (
                  // Shown in the picture's own shape, never cropped.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.image} alt="" loading="lazy" className="block h-auto w-full" />
                )}
                <span className="block p-3">
                  <b className="block text-sm">{o.title}</b>
                  {o.description && <span className="mt-0.5 block text-xs text-muted">{o.description}</span>}
                </span>
              </button>
              {o.code && (
                <div className="flex items-center justify-between gap-2 border-t border-line bg-surface-2/60 px-3 py-2">
                  <code className="min-w-0 truncate text-sm font-bold text-gold" title={o.code}>{o.code}</code>
                  <button type="button" onClick={() => void copy(o)} className="chip shrink-0 !px-2.5 !py-1 text-xs hover:border-gold" aria-label={`Copy code ${o.code}`}>
                    <span aria-hidden="true">{copied === o.id ? "✓" : "⧉"}</span> {copied === o.id ? "Copied" : "Copy"}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <p role="status" className="min-h-5 text-sm font-semibold text-teal">{note}</p>
    </section>
  );
}
