"use client";

import { useEffect, useState } from "react";

interface Option { id: number; kind: "topup" | "reward"; title: string; description: string; image: string }

/** "I want a top-up" and "Rewards": each opens the cards the admin wrote; tapping a card sends it to the admin's chat. */
export function WalletActions() {
  const [items, setItems] = useState<Option[]>([]);
  const [labels, setLabels] = useState({ topup: "I want a top-up", reward: "Rewards" });
  const [open, setOpen] = useState<"topup" | "reward" | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<number | null>(null);

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
            <li key={o.id}>
              <button type="button" disabled={busy === o.id} onClick={() => void choose(o)} className="card block h-full w-full overflow-hidden p-0 text-left transition-transform hover:-translate-y-0.5 hover:border-gold">
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
            </li>
          ))}
        </ul>
      )}
      <p role="status" className="min-h-5 text-sm font-semibold text-teal">{note}</p>
    </section>
  );
}
