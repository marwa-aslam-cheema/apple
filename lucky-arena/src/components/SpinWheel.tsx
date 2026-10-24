"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { fmt } from "@/lib/format";

export interface WheelSeg {
  id: number;
  label: string;
  credits: number;
  color: string;
}

const R = 150;
const polar = (deg: number, r = R) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [R + r * Math.cos(a), R + r * Math.sin(a)];
};

export function SpinWheel({ segments, cost, balance: initial, signedIn }: { segments: WheelSeg[]; cost: number; balance: number; signedIn: boolean }) {
  const router = useRouter();
  const [angle, setAngle] = useState(0);
  const [balance, setBalance] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ prize: number; label: string } | null>(null);
  const [error, setError] = useState("");
  const angleRef = useRef(0);

  const n = segments.length;
  const sa = 360 / n;
  const [duration, setDuration] = useState(4800);

  async function spin() {
    setError("");
    setResult(null);
    setBusy(true);
    try {
      const res = await fetch("/api/spin", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Spin failed.");
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const DURATION = reduce ? 600 : 4800;
      setDuration(DURATION);
      const idx = segments.findIndex((s) => s.id === data.segmentId);
      const center = (idx + 0.5) * sa + (Math.random() - 0.5) * sa * 0.6;
      const delta = ((((-center - angleRef.current) % 360) + 360) % 360) + (reduce ? 0 : 360 * 5);
      angleRef.current += delta;
      setAngle(angleRef.current);
      await new Promise((r) => setTimeout(r, DURATION + 100));
      setBalance(data.balance);
      setResult({ prize: data.prize, label: data.label });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Spin failed.");
    } finally {
      setBusy(false);
    }
  }

  const canAfford = balance >= cost;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5">
      <div className="relative w-full max-w-[22rem]">
        <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1" aria-hidden="true">
          <svg width="34" height="40" viewBox="0 0 34 40"><path d="M17 38L3 8a16 16 0 0 1 28 0z" fill="#f5b942" stroke="#1b1300" strokeWidth="2" /></svg>
        </div>
        <div className="overflow-hidden p-1">
        <svg
          viewBox="0 0 300 300"
          role="img"
          aria-label={`Prize wheel with ${n} segments`}
          className="w-full drop-shadow-[0_10px_30px_rgba(124,92,255,0.35)]"
          style={{ transform: `rotate(${angle}deg)`, transition: `transform ${duration}ms cubic-bezier(0.17, 0.67, 0.12, 1)` }}
        >
          <circle cx={R} cy={R} r={R - 2} fill="#12142d" stroke="#f5b942" strokeWidth="4" />
          {segments.map((s, i) => {
            const [x1, y1] = polar(i * sa, R - 8);
            const [x2, y2] = polar((i + 1) * sa, R - 8);
            const [tx, ty] = polar((i + 0.5) * sa, R * 0.66);
            return (
              <g key={s.id}>
                <path d={`M${R} ${R} L${x1} ${y1} A${R - 8} ${R - 8} 0 0 1 ${x2} ${y2}Z`} fill={s.color} stroke="#0a0b1e" strokeWidth="2" />
                <text x={tx} y={ty} fill="white" fontSize={s.label.length > 8 ? 11 : 15} fontWeight="800" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${(i + 0.5) * sa} ${tx} ${ty})`}>
                  {s.label}
                </text>
              </g>
            );
          })}
          <circle cx={R} cy={R} r="20" fill="#0a0b1e" stroke="#f5b942" strokeWidth="4" />
          <circle cx={R} cy={R} r="6" fill="#f5b942" />
        </svg>
        </div>
      </div>

      <div aria-live="polite" className="min-h-14 text-center">
        {error && <p className="font-semibold text-danger">{error}</p>}
        {result && (
          <p className="text-lg font-extrabold">
            {result.prize > 0 ? <span className="text-gold">You won {fmt(result.prize)} credits!</span> : <span className="text-muted">No prize this time. Try again!</span>}
          </p>
        )}
      </div>

      {signedIn ? (
        <>
          <button className="btn btn-gold w-full max-w-xs text-lg" onClick={spin} disabled={busy || !canAfford}>
            {busy ? "Spinning..." : `Spin for ${cost} credits`}
          </button>
          <p className="text-sm text-muted">Balance: <b className="text-ink">{fmt(balance)}</b> demo credits</p>
          {!canAfford && (
            <p className="text-center text-sm text-muted">
              Not enough credits. Claim your <Link className="text-gold underline" href="/wallet">daily bonus</Link> or check <Link className="text-gold underline" href="/promotions">promotions</Link>.
            </p>
          )}
        </>
      ) : (
        <div className="text-center">
          <p className="mb-3 text-muted">Sign in to get 1,000 free demo credits and spin.</p>
          <Link href="/register" className="btn btn-gold">Create free account</Link>
        </div>
      )}
    </div>
  );
}
