"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BetPicker } from "./BetPicker";
import { MAX_BET, MIN_BET } from "@/lib/config";
import { fmt } from "@/lib/format";
import { sfxResult, sfxSpin, unlockSfx } from "@/lib/sfx";
import { betLabel } from "@/lib/wheel-display";
import { segmentLayout } from "@/lib/wheel-layout";

export interface WheelSeg {
  id: number;
  label: string;
  icon: string;
  credits: number;
  color: string;
}

interface Win {
  prize: number;
  label: string;
  icon: string;
}

/** Celebration shown for every prize except "Try again". */
function WinPopup({ win, onClose }: { win: Win; onClose: () => void }) {
  const jackpot = win.prize >= 1000;
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    btn.current?.focus();
    const t = setTimeout(onClose, jackpot ? 9000 : 6000);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [jackpot, onClose]);
  const colors = ["#ffcf4a", "#ff4d8d", "#2fe0a8", "#fff4e0", "#b3123f"];
  return (
    <div role="dialog" aria-modal="true" aria-label={jackpot ? "Jackpot" : "You won"} className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-label="Close" onClick={onClose} tabIndex={-1} />
      <div className={`card marquee pop-in relative w-full max-w-sm overflow-hidden p-10 text-center ${jackpot ? "shadow-[0_0_80px_rgba(255,207,74,0.6)]" : ""}`}>
        {Array.from({ length: jackpot ? 40 : 22 }, (_, i) => (
          <span key={i} className="confetti" style={{ left: `${(i * 37) % 100}%`, background: colors[i % colors.length], animationDelay: `${(i % 9) * 0.28}s`, animationDuration: `${2.2 + (i % 5) * 0.4}s` }} />
        ))}
        <div className="float-slow relative text-7xl" aria-hidden="true">{win.icon || "🎉"}</div>
        <p className="neon-text relative mt-3 text-xs font-extrabold uppercase tracking-[0.35em]">{jackpot ? "Jackpot!" : "You won"}</p>
        <p className="gold-text relative font-[family-name:var(--font-display)] text-6xl font-extrabold">+{fmt(win.prize)}</p>
        <p className="relative mb-5 text-sm text-muted">credit{win.prize === 1 ? "" : "s"}</p>
        <button ref={btn} className="btn btn-gold relative w-full" onClick={onClose}>Collect</button>
      </div>
    </div>
  );
}

const R = 150;
const polar = (deg: number, r = R) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [R + r * Math.cos(a), R + r * Math.sin(a)];
};

export function SpinWheel({ kind, segments, defaultBet, maxMultiplier, balance: initial, signedIn, welcomeLeft: initialLeft }: { kind: "main" | "welcome"; segments: WheelSeg[]; defaultBet: number; maxMultiplier: number; balance: number; signedIn: boolean; welcomeLeft: number }) {
  const router = useRouter();
  const [angle, setAngle] = useState(0);
  const [balance, setBalance] = useState(initial);
  const [welcomeLeft, setWelcomeLeft] = useState(initialLeft);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ prize: number; label: string } | null>(null);
  const [error, setError] = useState("");
  const [win, setWin] = useState<Win | null>(null);
  const [bet, setBet] = useState(defaultBet);
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem("la_bet"));
      if (Number.isInteger(saved) && saved >= MIN_BET && saved <= MAX_BET) setBet(saved);
    } catch {
      /* private mode: use the default bet */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("la_bet", String(bet));
    } catch {
      /* not saved: fine */
    }
  }, [bet]);
  const angleRef = useRef(0);

  const n = segments.length;
  const sa = 360 / n;
  const [duration, setDuration] = useState(4800);

  async function spin() {
    unlockSfx(); // inside the click so the browser lets the wheel sounds play
    setError("");
    setResult(null);
    setBusy(true);
    try {
      const res = await fetch("/api/spin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(welcomeLeft > 0 ? {} : { bet }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Spin failed.");
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const DURATION = reduce ? 600 : 4800;
      setDuration(DURATION);
      const idx = segments.findIndex((s) => s.id === data.segmentId);
      if (idx < 0) {
        // The wheel on screen is out of date (e.g. the welcome wheel just ended): show the result and reload.
        setBalance(data.balance);
        setWelcomeLeft(data.welcomeLeft);
        setResult({ prize: data.prize, label: data.label });
        sfxResult(data.prize);
        if (data.prize > 0) setWin({ prize: data.prize, label: data.label, icon: data.icon ?? "" });
        router.refresh();
        return;
      }
      const center = (idx + 0.5) * sa + (Math.random() - 0.5) * sa * 0.6;
      const delta = ((((-center - angleRef.current) % 360) + 360) % 360) + (reduce ? 0 : 360 * 5);
      angleRef.current += delta;
      setAngle(angleRef.current);
      if (!reduce) sfxSpin(delta, sa, DURATION / 1000);
      await new Promise((r) => setTimeout(r, DURATION + 100));
      setBalance(data.balance);
      setWelcomeLeft(data.welcomeLeft);
      if (data.balance >= MIN_BET) setBet((b) => Math.min(b, data.balance)); // do not leave a bet the wallet cannot cover
      setResult({ prize: data.prize, label: data.label });
      sfxResult(data.prize);
      if (data.prize > 0) setWin({ prize: data.prize, label: data.label, icon: data.icon ?? "" }); // no popup for "Try again"
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Spin failed.");
    } finally {
      setBusy(false);
    }
  }

  const free = welcomeLeft > 0;
  const canAfford = free || balance >= bet;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5">
      <div className="relative w-full max-w-[22rem]">
        <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1" aria-hidden="true">
          <svg width="34" height="40" viewBox="0 0 34 40"><path d="M17 38L3 8a16 16 0 0 1 28 0z" fill="#f5b942" stroke="#1b1300" strokeWidth="2" /></svg>
        </div>
        <div className="pointer-events-none absolute inset-3 rounded-full shadow-[0_0_70px_rgba(255,190,60,0.38)]" aria-hidden="true" />
        <div className="relative overflow-hidden p-1">
        <svg
          viewBox="0 0 300 300"
          role="img"
          aria-label={`Prize wheel with ${n} segments`}
          className="relative w-full"
          style={{ transform: `rotate(${angle}deg)`, transition: `transform ${duration}ms cubic-bezier(0.17, 0.67, 0.12, 1)` }}
        >
          <defs>
            <linearGradient id="jp" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ff3b3b" />
              <stop offset="0.5" stopColor="#ffb52e" />
              <stop offset="1" stopColor="#ff3b3b" />
            </linearGradient>
          </defs>
          <circle cx={R} cy={R} r={R - 2} fill="#12142d" stroke="#f5b942" strokeWidth="4" />
          {segments.map((s, i) => {
            const [x1, y1] = polar(i * sa, R - 8);
            const [x2, y2] = polar((i + 1) * sa, R - 8);
            const text = betLabel(s, free ? "welcome" : kind, bet);
            const L = segmentLayout(text, sa);
            const rText = (L.textInner + L.textOuter) / 2;
            const maxLen = L.textOuter - L.textInner;
            const mid = (i + 0.5) * sa;
            const flip = mid > 180; // left half: read towards the centre so digits are never upside-down
            return (
              <g key={s.id}>
                <path d={`M${R} ${R} L${x1} ${y1} A${R - 8} ${R - 8} 0 0 1 ${x2} ${y2}Z`} fill={s.credits >= 1000 ? "url(#jp)" : s.color} stroke="#0a0b1e" strokeWidth="2" />
                {/* Inside this group "up" points from the centre to the rim, so icon and label sit along the slice's own radius. */}
                <g transform={`rotate(${(i + 0.5) * sa} ${R} ${R})`}>
                  {s.icon && (
                    <text x={R} y={R - L.iconRadius} fontSize={L.iconSize} textAnchor="middle" dominantBaseline="central">{s.icon}</text>
                  )}
                  <g transform={`rotate(${flip ? 90 : -90} ${R} ${R - rText})`}>
                    {L.lines.map((line, k) => (
                      <text
                        key={k}
                        x={R}
                        y={R - rText + (k - (L.lines.length - 1) / 2) * L.fontSize * 1.15}
                        fontSize={L.fontSize}
                        fontWeight="800"
                        fill="white"
                        stroke="rgba(0,0,0,0.6)"
                        strokeWidth="2.4"
                        paintOrder="stroke"
                        textAnchor="middle"
                        dominantBaseline="central"
                        textLength={line.length * L.fontSize * 0.68 > maxLen ? maxLen : undefined}
                        lengthAdjust="spacingAndGlyphs"
                      >
                        {line}
                      </text>
                    ))}
                  </g>
                </g>
              </g>
            );
          })}
          <circle cx={R} cy={R} r="20" fill="#0a0b1e" stroke="#f5b942" strokeWidth="4" />
          <circle cx={R} cy={R} r="6" fill="#f5b942" />
        </svg>
        <svg viewBox="0 0 300 300" className="pointer-events-none absolute inset-0 h-full w-full p-1" aria-hidden="true">
          {Array.from({ length: 24 }, (_, i) => {
            const [bx, by] = polar(i * 15, R - 2);
            return <circle key={i} cx={bx} cy={by} r="3.4" fill="#fff3b0" className="bulb" style={{ filter: "drop-shadow(0 0 3px #ffb52e)" }} />;
          })}
        </svg>
        </div>
      </div>

      {win && <WinPopup win={win} onClose={() => setWin(null)} />}

      <div aria-live="polite" className="min-h-14 text-center">
        {error && <p className="font-semibold text-danger">{error}</p>}
        {result && (
          <p className="text-lg font-extrabold">
            {result.prize > 0 ? <span className="text-gold">You won {fmt(result.prize)} credit{result.prize === 1 ? "" : "s"}!</span> : <span className="text-muted">{result.label === "Try next time" ? "Try next time!" : "No prize this time. Try again!"}</span>}
          </p>
        )}
      </div>

      {signedIn ? (
        <>
          {!free && <BetPicker bet={bet} onChange={setBet} balance={balance} disabled={busy} maxMultiplier={maxMultiplier} />}
          <div className="flex w-full max-w-xs items-center gap-2">
            {!free && <button type="button" className="btn btn-ghost !px-4 text-xl" aria-label="Lower the bet" disabled={busy || bet <= MIN_BET} onClick={() => setBet((b) => Math.max(MIN_BET, b - (b <= 10 ? 1 : b <= 100 ? 10 : b <= 500 ? 50 : 100)))}>-</button>}
            <button className="btn btn-gold min-w-0 flex-1 text-lg" onClick={spin} disabled={busy || !canAfford}>
              {busy ? "Spinning..." : free ? `Free welcome spin (${welcomeLeft} left)` : `Spin for ${fmt(bet)} credit${bet === 1 ? "" : "s"}`}
            </button>
            {!free && <button type="button" className="btn btn-ghost !px-4 text-xl" aria-label="Raise the bet" disabled={busy || bet >= MAX_BET} onClick={() => setBet((b) => Math.min(MAX_BET, b + (b < 10 ? 1 : b < 100 ? 10 : b < 500 ? 50 : 100)))}>+</button>}
          </div>
          <p className="text-sm text-muted">Balance: <b className="text-ink">{fmt(balance)}</b> credits</p>
          {!canAfford && (
            <p className="text-center text-sm text-muted">
              {balance >= MIN_BET ? "Your balance does not cover this bet: lower it, or " : "Not enough credits. "}claim your <Link className="text-gold underline" href="/wallet">daily bonus</Link> or check <Link className="text-gold underline" href="/promotions">promotions</Link>.
            </p>
          )}
        </>
      ) : (
        <div className="text-center">
          <p className="mb-3 text-muted">Create a free account to start at zero and spin the welcome wheel.</p>
          <Link href="/register" className="btn btn-gold">Create free account</Link>
        </div>
      )}
    </div>
  );
}
