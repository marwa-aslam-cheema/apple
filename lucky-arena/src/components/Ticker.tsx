"use client";

import { useEffect, useState } from "react";

interface Data { enabled: boolean; lines: string[]; wins: { who: string; prize: number }[] }

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/** The thin strip under the top bar: the admin's own lines mixed with real recent wins, in random order (up to 20 items). */
export function Ticker() {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    const load = () =>
      fetch("/api/promo", { cache: "no-store" })
        .then((r) => r.json())
        .then((d: { ticker: Data }) => {
          const t = d.ticker;
          if (!t.enabled) return setItems([]);
          const wins = t.wins.map((w) => `🎰 ${w.who} won ${w.prize.toLocaleString("en-US")} credits`);
          setItems(shuffle([...t.lines, ...wins]).slice(0, 20));
        })
        .catch(() => undefined);
    void load();
    window.addEventListener("la:content-changed", load); // the admin edited the lines
    return () => window.removeEventListener("la:content-changed", load);
  }, []);

  if (items.length === 0) return null;
  const loop = [...items, ...items]; // the second copy lets the strip repeat without a gap
  return (
    <div className="ticker" role="marquee" aria-label="Latest news" style={{ ["--ticker-time" as string]: `${Math.max(20, items.length * 5)}s` }}>
      <div className="ticker-track">
        {loop.map((t, i) => <span key={i} className="ticker-item" aria-hidden={i >= items.length}>{t}</span>)}
      </div>
    </div>
  );
}
