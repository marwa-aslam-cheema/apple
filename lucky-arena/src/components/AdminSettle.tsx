"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { fmt } from "@/lib/format";

/** The player is inside a game that cannot report back: type what they have there and bring it to their wallet. */
export function AdminSettle({ userId, game, stake }: { userId: number; game: string; stake: number }) {
  const router = useRouter();
  const [balance, setBalance] = useState(String(stake));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function settle() {
    if (!confirm(`Put ${fmt(Number(balance))} credits in the player's wallet and close ${game}?`)) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/settle`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ balance: Number(balance) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed.");
      setMsg({ ok: true, text: `Done. ${fmt(data.returned)} credits are back in the wallet.` });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Failed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm">In <b>{game}</b> right now. Took {fmt(stake)} credits in.</p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-semibold text-muted">Balance the player has in the game now
          <input type="number" min={0} inputMode="numeric" className="input mt-1 w-40" value={balance} onChange={(e) => setBalance(e.target.value)} />
        </label>
        <button className="btn btn-gold" disabled={busy || balance === "" || !(Number(balance) >= 0)} onClick={settle}>Bring credits back</button>
      </div>
      <p className="text-xs text-muted">Look at the player's balance in the game's own back office, type it here and press the button. It goes to the wallet and the game is closed.</p>
      {msg && <p role="status" className={`text-sm font-semibold ${msg.ok ? "text-teal" : "text-danger"}`}>{msg.text}</p>}
    </div>
  );
}
