"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCurrencyWord } from "./Currency";
import { ChipIcon } from "./Logo";

/** Shown to a new Google player: the welcome bonus waits until they tap Claim. */
export function WelcomeBonusPopup({ amount }: { amount: number }) {
  const router = useRouter();
  const word = useCurrencyWord();
  const [open, setOpen] = useState(amount > 0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function done() {
    setOpen(false);
    window.dispatchEvent(new Event("la:promo-done")); // the notifications popup comes next
  }

  async function claim() {
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/bonus/welcome", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not claim.");
      router.refresh(); // the balance in the header
      await done();
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Could not claim.");
      setBusy(false);
    }
  }

  if (!open || amount <= 0) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="Claim your welcome bonus" className="fixed inset-0 z-[66] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div className="card marquee pop-in relative w-full max-w-sm overflow-hidden bg-gradient-to-br from-[#4a0b26] via-[#1d0b1d] to-[#0d060f] p-8 text-center">
        <div className="relative flex items-end justify-center gap-2" aria-hidden="true">
          <span className="coin-bounce"><ChipIcon size={34} /></span>
          <span className="coin-bounce text-5xl" style={{ animationDelay: ".25s" }}>🎁</span>
          <span className="coin-bounce" style={{ animationDelay: ".5s" }}><ChipIcon size={34} /></span>
        </div>
        <h2 className="gold-text relative mt-3 text-3xl font-extrabold uppercase">Claim your welcome free bonus</h2>
        <p className="relative mt-2 text-lg font-semibold text-ink">{`${amount} free ${word} are waiting for you!`}</p>
        <button className="btn btn-gold shine relative mt-6 w-full text-lg" disabled={busy} onClick={claim}>{busy ? "Please wait..." : `Claim ${amount} ${word}`}</button>
        {note && <p role="alert" className="relative mt-2 text-sm font-semibold text-danger">{note}</p>}
      </div>
    </div>
  );
}
