"use client";

import { useEffect, useState } from "react";
import { useCurrencyWord } from "./Currency";
import { ChipIcon } from "./Logo";

/**
 * Shown once to a brand-new player (made in the last 15 minutes). Tapping the button sends "I want free credits" to the admin's
 * chat, and the admin loads whatever amount they like.
 */
export function WelcomeBonusPopup({ signedIn, role, createdAt }: { signedIn: boolean; role: string; createdAt: number }) {
  const word = useCurrencyWord();
  const brandNew = signedIn && role !== "admin" && createdAt > 0 && Date.now() - createdAt < 15 * 60_000;
  const key = `la_welcome_popup_${createdAt}`;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!brandNew) return;
    try {
      if (localStorage.getItem(key)) { window.dispatchEvent(new Event("la:promo-done")); return; }
    } catch {
      /* private mode: it may show again, which is fine */
    }
    const t = setTimeout(() => setOpen(true), 800);
    return () => clearTimeout(t);
  }, [brandNew, key]);

  function done() {
    setOpen(false);
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event("la:promo-done")); // the notifications popup comes next
  }

  async function ask() {
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/credits/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ welcome: true }) });
      if (!res.ok) throw new Error();
      done();
      window.dispatchEvent(new Event("la:open-chat")); // the player sees the message that went to the admin
    } catch {
      setNote("Could not send. Try again.");
      setBusy(false);
    }
  }

  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="Claim your welcome free bonus" className="fixed inset-0 z-[66] flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/75 backdrop-blur-sm" aria-label="Close" tabIndex={-1} onClick={done} />
      <div className="card marquee pop-in relative w-full max-w-sm overflow-hidden bg-gradient-to-br from-[#4a0b26] via-[#1d0b1d] to-[#0d060f] p-8 text-center">
        <button className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-muted hover:bg-black/30 hover:text-ink" aria-label="Close" onClick={done}>×</button>
        <div className="relative flex items-end justify-center gap-2" aria-hidden="true">
          <span className="coin-bounce"><ChipIcon size={34} /></span>
          <span className="coin-bounce text-5xl" style={{ animationDelay: ".25s" }}>🎁</span>
          <span className="coin-bounce" style={{ animationDelay: ".5s" }}><ChipIcon size={34} /></span>
        </div>
        <h2 className="gold-text relative mt-3 text-3xl font-extrabold uppercase">Claim your welcome free bonus</h2>
        <button className="btn btn-gold shine relative mt-6 w-full text-lg" disabled={busy} onClick={ask}>{busy ? "Please wait..." : `I want free ${word}`}</button>
        <button className="tap relative mt-2 text-xs text-muted underline" onClick={done}>Maybe later</button>
        {note && <p role="alert" className="relative mt-2 text-sm font-semibold text-danger">{note}</p>}
      </div>
    </div>
  );
}
