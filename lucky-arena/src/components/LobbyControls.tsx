"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

const CATS = ["All", "Featured", "Wheel", "Cards", "Arcade", "Puzzle", "Trivia"];

export function LobbyControls({ q, cat }: { q: string; cat: string }) {
  const router = useRouter();
  const [value, setValue] = useState(q);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => {
      const p = new URLSearchParams();
      if (value.trim()) p.set("q", value.trim());
      if (cat !== "All") p.set("cat", cat);
      router.replace(`/games${p.size ? `?${p}` : ""}`);
    }, 250);
    return () => clearTimeout(t);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const href = (c: string) => {
    const p = new URLSearchParams();
    if (value.trim()) p.set("q", value.trim());
    if (c !== "All") p.set("cat", c);
    return `/games${p.size ? `?${p}` : ""}`;
  };

  return (
    <div className="space-y-3">
      <label className="relative block">
        <span className="sr-only">Search games</span>
        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search games"
          className="input pl-10"
        />
      </label>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Categories">
        {CATS.map((c) => (
          <Link key={c} href={href(c)} className="chip" aria-current={cat === c ? "true" : undefined} role="tab" aria-selected={cat === c}>{c}</Link>
        ))}
      </div>
    </div>
  );
}
