"use client";

import { useState } from "react";

export interface GameKeyRow { id: number; title: string; apiKey: string; link: string }

/** The secret a game's own server uses to talk to this site (see README: Connecting your own game). */
export function AdminGameKeys({ rows }: { rows: GameKeyRow[] }) {
  const [keys, setKeys] = useState<Record<number, string>>(Object.fromEntries(rows.map((r) => [r.id, r.apiKey])));
  async function renew(id: number) {
    if (!confirm("Make a new key? The old one stops working.")) return;
    const res = await fetch(`/api/admin/games/${id}/key`, { method: "POST" });
    const data = await res.json();
    if (res.ok) setKeys((k) => ({ ...k, [id]: data.apiKey }));
  }
  const linked = rows.filter((r) => r.link);
  if (linked.length === 0) return null;
  return (
    <section className="card space-y-3 p-4">
      <h2 className="font-bold">API keys for linked games</h2>
      <p className="text-xs text-muted">Only needed if the game's own server can call this site. Keep keys private. Never put a game's admin password here.</p>
      <ul className="space-y-2 text-sm">
        {linked.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-2">
            <b className="w-40 truncate">{r.title}</b>
            <input readOnly className="input min-w-0 flex-1 text-xs" value={keys[r.id]} onFocus={(e) => e.currentTarget.select()} aria-label={`API key for ${r.title}`} />
            <button className="chip hover:border-gold" onClick={() => renew(r.id)}>New key</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
