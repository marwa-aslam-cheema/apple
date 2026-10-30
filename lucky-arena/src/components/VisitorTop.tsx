"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChipIcon } from "./Logo";
import { Ticker } from "./Ticker";

interface Popup { enabled: boolean; title: string; text: string; button: string; timerHours: number }

const KEY = "la_bonus_deadline";
const pad = (n: number) => String(n).padStart(2, "0");

/** The top of the home page for visitors without an account: sign in / create account, the signup bonus with its countdown, then the strip. */
export function VisitorTop() {
  const [popup, setPopup] = useState<Popup | null>(null);
  const [left, setLeft] = useState<number | null>(null); // ms until the offer ends

  useEffect(() => {
    let alive = true;
    fetch("/api/promo", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { popup: Popup }) => {
        if (!alive) return;
        setPopup(d.popup);
        const hours = d.popup.timerHours;
        if (!hours) return setLeft(null);
        let deadline = 0;
        try {
          deadline = Number(localStorage.getItem(KEY)) || 0;
          // The countdown starts at the visitor's first visit and is never restarted.
          if (!deadline) { deadline = Date.now() + hours * 3600_000; localStorage.setItem(KEY, String(deadline)); }
        } catch {
          deadline = Date.now() + hours * 3600_000;
        }
        setLeft(Math.max(0, deadline - Date.now()));
        const tick = setInterval(() => setLeft(Math.max(0, deadline - Date.now())), 1000);
        return () => clearInterval(tick);
      })
      .catch(() => undefined);
    return () => { alive = false; };
  }, []);

  const secs = left === null ? null : Math.floor(left / 1000);
  const ended = secs === 0;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Link href="/login" className="btn btn-ghost w-full text-base">Sign in</Link>
        <Link href="/register" className="btn btn-gold shine w-full text-base">Create account</Link>
      </div>

      {popup?.enabled && (
        <section className="card marquee relative overflow-hidden bg-gradient-to-br from-[#4a0b26] via-[#1d0b1d] to-[#0d060f] p-6 text-center">
          <div className="spotlight pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="relative flex items-end justify-center gap-2" aria-hidden="true">
            <span className="coin-bounce"><ChipIcon size={30} /></span>
            <span className="coin-bounce text-4xl" style={{ animationDelay: ".25s" }}>🎰</span>
            <span className="coin-bounce" style={{ animationDelay: ".5s" }}><ChipIcon size={30} /></span>
          </div>
          <h2 className="gold-text relative mt-2 text-3xl font-extrabold uppercase">{popup.title}</h2>
          {popup.text && <p className="relative mt-1 text-lg font-semibold">{popup.text}</p>}
          {secs !== null && (
            <p className="relative mt-3 text-sm font-semibold text-muted" data-testid="bonus-timer">
              {ended ? "This offer has ended." : (
                <>Offer ends in <b className="font-mono text-xl text-gold">{pad(Math.floor(secs / 3600))}:{pad(Math.floor((secs % 3600) / 60))}:{pad(secs % 60)}</b></>
              )}
            </p>
          )}
          <Link href="/register" className="btn btn-gold shine relative mt-4 w-full max-w-xs text-lg">{popup.button}</Link>
        </section>
      )}

      <div className="-mx-4 overflow-hidden rounded-xl border border-gold/20 sm:mx-0"><Ticker /></div>
    </div>
  );
}
