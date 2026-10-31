"use client";

import { useEffect, useState } from "react";
import { ChipIcon } from "./Logo";

const pad = (n: number) => String(n).padStart(2, "0");

/** The sign-up bonus box with its countdown (home page, once the free welcome spins are used), or the admin's Regular Bonus after the sign-up bonus was claimed. */
export function MemberBonus({ title, text, button, deadline, kind = "signup" }: { title: string; text: string; button: string; deadline: number; kind?: "signup" | "regular" }) {
  const [left, setLeft] = useState<number | null>(deadline ? Math.max(0, deadline - Date.now()) : null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!deadline) return;
    const tick = setInterval(() => setLeft(Math.max(0, deadline - Date.now())), 1000);
    return () => clearInterval(tick);
  }, [deadline]);

  async function ask() {
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/credits/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(kind === "regular" ? { regular: true } : { signup: true }) });
      if (!res.ok) throw new Error();
      window.dispatchEvent(new Event("la:open-chat")); // the player sees the message that went to the admin
    } catch {
      setNote("Could not send. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const secs = left === null ? null : Math.floor(left / 1000);
  if (secs === 0) return null; // the offer is over
  return (
    <section className="card marquee relative overflow-hidden bg-gradient-to-br from-[#4a0b26] via-[#1d0b1d] to-[#0d060f] p-6 text-center">
      <div className="spotlight pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative flex items-end justify-center gap-2" aria-hidden="true">
        <span className="coin-bounce"><ChipIcon size={30} /></span>
        <span className="coin-bounce text-4xl" style={{ animationDelay: ".25s" }}>🎰</span>
        <span className="coin-bounce" style={{ animationDelay: ".5s" }}><ChipIcon size={30} /></span>
      </div>
      <h2 className="gold-text relative mt-2 text-3xl font-extrabold uppercase">{title}</h2>
      {text && <p className="relative mt-1 text-lg font-semibold">{text}</p>}
      {secs !== null && (
        <p className="relative mt-3 text-sm font-semibold text-muted" data-testid="bonus-timer">
          Offer ends in <b className="font-mono text-xl text-gold">{pad(Math.floor(secs / 3600))}:{pad(Math.floor((secs % 3600) / 60))}:{pad(secs % 60)}</b>
        </p>
      )}
      <button className="btn btn-gold shine relative mt-4 w-full max-w-xs text-lg" disabled={busy} onClick={ask}>{busy ? "Please wait..." : button}</button>
      {note && <p role="alert" className="relative mt-2 text-sm font-semibold text-danger">{note}</p>}
    </section>
  );
}
