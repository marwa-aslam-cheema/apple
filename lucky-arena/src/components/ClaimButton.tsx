"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { fmt } from "@/lib/format";

export function ClaimButton({ url, label, disabled, doneLabel }: { url: string; label: string; disabled?: boolean; doneLabel?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function claim() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(url, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not claim.");
      setMsg({ ok: true, text: `+${fmt(data.reward)} credits added!` });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not claim." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button className="btn btn-gold w-full sm:w-auto" onClick={claim} disabled={busy || disabled}>
        {disabled && doneLabel ? doneLabel : busy ? "Claiming..." : label}
      </button>
      <p role="status" className={`mt-2 min-h-5 text-sm font-semibold ${msg?.ok ? "text-teal" : "text-danger"}`}>{msg?.text}</p>
    </div>
  );
}
