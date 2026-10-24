"use client";

import { useEffect, useState } from "react";
import { fmt } from "@/lib/format";
import { MAX_BET, MIN_BET } from "@/lib/config";

const PRESETS = [1, 5, 10, 50, 100, 500, 1000];
const clamp = (n: number) => Math.min(MAX_BET, Math.max(MIN_BET, Math.round(n) || MIN_BET));

/** Choose a bet from 1 to 1,000: type it, drag the slider, nudge with + / - or tap a preset. */
export function BetPicker({ bet, onChange, balance, disabled, maxMultiplier }: { bet: number; onChange: (n: number) => void; balance: number; disabled?: boolean; maxMultiplier: number }) {
  const [text, setText] = useState(String(bet));
  useEffect(() => setText(String(bet)), [bet]);
  const step = bet < 10 ? 1 : bet < 100 ? 10 : bet < 500 ? 50 : 100;
  const maxBet = Math.max(MIN_BET, Math.min(MAX_BET, balance));

  return (
    <div className="w-full max-w-xs space-y-3" role="group" aria-label="Choose your bet">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-bold">Your bet</span>
        <span className="text-xs text-muted">{MIN_BET} to {fmt(MAX_BET)} credits</span>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className="btn btn-ghost !px-4 text-xl" aria-label="Lower the bet" disabled={disabled || bet <= MIN_BET} onClick={() => onChange(clamp(bet - step))}>-</button>
        <input
          type="number"
          inputMode="numeric"
          min={MIN_BET}
          max={MAX_BET}
          aria-label="Bet amount"
          className="input text-center text-xl font-extrabold"
          disabled={disabled}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const n = Number(e.target.value);
            if (Number.isInteger(n) && n >= MIN_BET && n <= MAX_BET) onChange(n);
          }}
          onBlur={() => setText(String(bet))}
        />
        <button type="button" className="btn btn-ghost !px-4 text-xl" aria-label="Raise the bet" disabled={disabled || bet >= MAX_BET} onClick={() => onChange(clamp(bet + step))}>+</button>
      </div>
      <input type="range" aria-label="Bet slider" className="w-full accent-[#ffcf4a]" min={MIN_BET} max={MAX_BET} value={bet} disabled={disabled} onChange={(e) => onChange(clamp(Number(e.target.value)))} />
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button key={p} type="button" className="chip !px-3 !py-1.5" aria-current={bet === p ? "true" : undefined} disabled={disabled} onClick={() => onChange(p)}>{fmt(p)}</button>
        ))}
        <button type="button" className="chip !px-3 !py-1.5" disabled={disabled || balance < MIN_BET} onClick={() => onChange(maxBet)}>Max</button>
      </div>
      <p className="text-xs text-muted">The jackpot pays <b className="text-gold">{fmt(bet * maxMultiplier)}</b> at this bet.</p>
    </div>
  );
}
