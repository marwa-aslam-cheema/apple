import type { CSSProperties, ReactElement } from "react";

/**
 * Decorative casino scene behind the home page: slot machines, playing cards, chips and dice drifting about,
 * with gold coins falling. It is positioned (not fixed), so it scrolls together with the page.
 */

function Slot({ hue = 0 }: { hue?: number }): ReactElement {
  return (
    <svg viewBox="0 0 120 180" className="h-full w-full">
      <rect x="10" y="14" width="86" height="150" rx="14" fill={hue ? "#143f7a" : "#a3123d"} stroke="#ffcf4a" strokeWidth="4" />
      <rect x="20" y="22" width="66" height="22" rx="6" fill="#12081a" stroke="#ffcf4a" strokeWidth="2" />
      {[0, 1, 2, 3, 4].map((i) => <circle key={i} cx={28 + i * 12.5} cy="33" r="3.2" fill={i % 2 ? "#fff3b0" : "#ff9d2e"} />)}
      <rect x="20" y="56" width="66" height="46" rx="6" fill="#fff4e0" stroke="#ffcf4a" strokeWidth="2" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={24 + i * 21} y="60" width="19" height="38" rx="3" fill="#ffffff" stroke="#c9a14a" strokeWidth="1" />
          <text x={33.5 + i * 21} y="88" textAnchor="middle" fontSize="28" fontWeight="900" fill={i === 1 ? "#ff3b3b" : "#b3123f"}>7</text>
        </g>
      ))}
      <rect x="22" y="112" width="62" height="12" rx="6" fill="#12081a" />
      <circle cx="53" cy="118" r="4" fill="#ffcf4a" />
      <rect x="22" y="134" width="62" height="22" rx="5" fill="#12081a" stroke="#ffcf4a" strokeWidth="1.5" />
      <rect x="96" y="40" width="7" height="58" rx="3.5" fill="#c9a14a" />
      <circle cx="99.5" cy="36" r="9" fill="#ff3b3b" stroke="#fff3b0" strokeWidth="2" />
    </svg>
  );
}

function Card({ rank, suit, red }: { rank: string; suit: string; red: boolean }): ReactElement {
  const color = red ? "#c0143c" : "#17101c";
  return (
    <svg viewBox="0 0 70 100" className="h-full w-full">
      <rect x="2" y="2" width="66" height="96" rx="8" fill="#fff8ea" stroke="#d6b45a" strokeWidth="2" />
      <text x="9" y="22" fontSize="17" fontWeight="800" fill={color}>{rank}</text>
      <text x="9" y="38" fontSize="15" fill={color}>{suit}</text>
      <text x="35" y="66" textAnchor="middle" fontSize="36" fill={color}>{suit}</text>
    </svg>
  );
}

function Chip(): ReactElement {
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full">
      <circle cx="24" cy="24" r="22" fill="#b3123f" stroke="#ffcf4a" strokeWidth="3" />
      <circle cx="24" cy="24" r="15" fill="none" stroke="#fff4e0" strokeWidth="4" strokeDasharray="6 6" />
      <circle cx="24" cy="24" r="7" fill="#ffcf4a" />
    </svg>
  );
}

function Dice({ n }: { n: number }): ReactElement {
  const spots: Record<number, [number, number][]> = {
    1: [[24, 24]], 3: [[14, 14], [24, 24], [34, 34]], 5: [[14, 14], [34, 14], [24, 24], [14, 34], [34, 34]], 6: [[14, 12], [34, 12], [14, 24], [34, 24], [14, 36], [34, 36]],
  };
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full">
      <rect x="3" y="3" width="42" height="42" rx="9" fill="#fff8ea" stroke="#d6b45a" strokeWidth="2" />
      {(spots[n] ?? spots[1]).map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4" fill="#b3123f" />)}
    </svg>
  );
}

function Coin(): ReactElement {
  return (
    <svg viewBox="0 0 40 40" className="h-full w-full">
      <circle cx="20" cy="20" r="18" fill="#ffcf4a" stroke="#8a5a05" strokeWidth="2" />
      <path d="M8 16a13 13 0 0 1 14-9" fill="none" stroke="#fff3b0" strokeWidth="3" strokeLinecap="round" />
      <circle cx="20" cy="20" r="12.5" fill="none" stroke="#c58a0a" strokeWidth="2" />
      <path d="M20 11l2.6 5.4 5.9.8-4.3 4.1 1 5.9L20 24.4l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" fill="#c58a0a" />
    </svg>
  );
}

type Pos = { l: number; t: number; w: number; r?: number; d?: number; o?: number; hideSm?: boolean };
const machines: Pos[] = [
  { l: 1, t: 6, w: 112, r: -6, o: 0.42 }, { l: 90, t: 14, w: 120, r: 5, o: 0.42 }, { l: 3, t: 40, w: 100, r: 4, o: 0.38 },
  { l: 88, t: 52, w: 108, r: -4, o: 0.42 }, { l: 2, t: 74, w: 116, r: -3, o: 0.45 }, { l: 90, t: 84, w: 104, r: 6, o: 0.42 },
];
const cards: (Pos & { rank: string; suit: string; red: boolean })[] = [
  { l: 14, t: 3, w: 62, r: -18, d: 0, o: 0.8, rank: "A", suit: "♠", red: false },
  { l: 78, t: 9, w: 58, r: 16, d: 1, o: 0.75, rank: "K", suit: "♥", red: true },
  { l: 8, t: 26, w: 54, r: 12, d: 2, o: 0.7, rank: "Q", suit: "♦", red: true },
  { l: 84, t: 34, w: 60, r: -14, d: 3, o: 0.75, rank: "J", suit: "♣", red: false },
  { l: 16, t: 57, w: 58, r: -10, d: 1.5, o: 0.7, rank: "10", suit: "♥", red: true },
  { l: 80, t: 66, w: 56, r: 18, d: 2.5, o: 0.7, rank: "A", suit: "♦", red: true },
  { l: 10, t: 90, w: 60, r: 14, d: 0.5, o: 0.7, rank: "K", suit: "♠", red: false },
  { l: 82, t: 94, w: 58, r: -16, d: 3.5, o: 0.7, rank: "Q", suit: "♣", red: false },
];
const chips: Pos[] = [{ l: 22, t: 14, w: 40, d: 1 }, { l: 70, t: 22, w: 34, d: 2 }, { l: 24, t: 46, w: 36, d: 0 }, { l: 72, t: 60, w: 42, d: 3 }, { l: 26, t: 80, w: 34, d: 2 }, { l: 68, t: 92, w: 38, d: 1 }];
const dice: (Pos & { n: number })[] = [{ l: 6, t: 16, w: 40, r: 20, n: 5, d: 0 }, { l: 92, t: 44, w: 38, r: -16, n: 3, d: 2 }, { l: 7, t: 66, w: 40, r: -22, n: 6, d: 1 }, { l: 93, t: 76, w: 36, r: 14, n: 1, d: 3 }];
const coins = Array.from({ length: 18 }, (_, i) => ({ l: (i * 53 + 7) % 96, size: 20 + ((i * 7) % 5) * 5, delay: -((i * 2.3) % 14), dur: 9 + ((i * 5) % 8) }));
const sparkles = Array.from({ length: 16 }, (_, i) => ({ l: (i * 37 + 11) % 98, t: (i * 29 + 5) % 98, delay: (i % 6) * 0.5 }));

const abs = (p: Pos): CSSProperties => ({ left: `${p.l}%`, top: `${p.t}%`, width: `min(${p.w}px, ${Math.round(p.w / 4.6)}vw)`, opacity: p.o ?? 1, ["--r" as string]: `${p.r ?? 0}deg`, animationDelay: `${p.d ?? 0}s` });

export function CasinoBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-[-1.5rem] left-1/2 -z-10 w-[100vw] -translate-x-1/2 overflow-hidden lg:w-[calc(100vw-16rem)]"
      style={{
        background:
          "radial-gradient(900px 480px at 50% 0%, rgba(255,190,70,0.22), transparent 65%), linear-gradient(180deg, #2e0b1f 0%, #170a1b 38%, #0d0610 70%, #0a0509 100%)",
      }}
    >
      <div className="absolute inset-0 opacity-70" style={{ backgroundImage: "repeating-linear-gradient(45deg, rgba(255,207,74,0.05) 0 1px, transparent 1px 22px), repeating-linear-gradient(-45deg, rgba(255,207,74,0.05) 0 1px, transparent 1px 22px)" }} />
      {sparkles.map((s, i) => (
        <span key={`s${i}`} className="twinkle absolute h-1.5 w-1.5 rounded-full bg-[#fff3b0]" style={{ left: `${s.l}%`, top: `${s.t}%`, animationDelay: `${s.delay}s` }} />
      ))}
      {machines.map((m, i) => (
        <div key={`m${i}`} className="float-slow absolute" style={{ ...abs(m), aspectRatio: "120 / 180", ["--r" as string]: `${m.r}deg` }}><Slot hue={i % 3 === 2 ? 1 : 0} /></div>
      ))}
      {cards.map((c, i) => (
        <div key={`c${i}`} className={`${i % 2 ? "float-slower" : "float-slow"} absolute`} style={{ ...abs(c), aspectRatio: "70 / 100" }}><Card rank={c.rank} suit={c.suit} red={c.red} /></div>
      ))}
      {chips.map((c, i) => (
        <div key={`h${i}`} className="float-slower absolute" style={{ ...abs(c), aspectRatio: "1", opacity: 0.85 }}><Chip /></div>
      ))}
      {dice.map((d, i) => (
        <div key={`d${i}`} className="float-slow absolute" style={{ ...abs(d), aspectRatio: "1", opacity: 0.8 }}><Dice n={d.n} /></div>
      ))}
      {coins.map((c, i) => (
        <div key={`k${i}`} className="coin-fall absolute" style={{ left: `${c.l}%`, width: c.size, height: c.size, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }}>
          <div className="coin-spin h-full w-full" style={{ animationDuration: `${1.1 + (i % 4) * 0.25}s` }}><Coin /></div>
        </div>
      ))}
    </div>
  );
}
