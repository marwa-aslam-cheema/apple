"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** The names written on the two buttons of the player's wallet page. */
export function AdminWalletLabels({ topup, reward }: { topup: string; reward: string }) {
  const router = useRouter();
  const [t, setT] = useState(topup);
  const [r, setR] = useState(reward);
  const [msg, setMsg] = useState("");
  async function save() {
    const res = await fetch("/api/admin/wallet-labels", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topup: t, reward: r }) });
    setMsg(res.ok ? "Saved." : "Could not save.");
    if (res.ok) router.refresh();
  }
  return (
    <div className="card space-y-3 p-4">
      <h2 className="font-bold">Button names</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-muted">First button
          <input className="input mt-1" value={t} maxLength={30} onChange={(e) => setT(e.target.value)} />
        </label>
        <label className="block text-xs font-semibold text-muted">Second button
          <input className="input mt-1" value={r} maxLength={30} onChange={(e) => setR(e.target.value)} />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn btn-violet" onClick={save}>Save names</button>
        <span role="status" className="text-sm font-semibold text-teal">{msg}</span>
      </div>
    </div>
  );
}
