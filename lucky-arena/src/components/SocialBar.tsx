"use client";

import { useEffect, useState } from "react";

interface SocialLink { id: number; kind: string; label: string; url: string }

const LOOK: Record<string, { icon: string; cls: string }> = {
  Facebook: { icon: "f", cls: "bg-[#1877f2]" },
  WhatsApp: { icon: "W", cls: "bg-[#25d366] !text-black" },
  Instagram: { icon: "I", cls: "bg-gradient-to-br from-[#feda75] via-[#d62976] to-[#4f5bd5]" },
  Telegram: { icon: "T", cls: "bg-[#229ed9]" },
  TikTok: { icon: "♪", cls: "bg-black border border-white/30" },
  YouTube: { icon: "▶", cls: "bg-[#ff0000]" },
  Other: { icon: "★", cls: "bg-violet" },
};

let cache: SocialLink[] | null = null;

/** The admin's social accounts as small buttons. Renders nothing when none are set. */
export function SocialBar({ title = "Follow us", className = "" }: { title?: string; className?: string }) {
  const [links, setLinks] = useState<SocialLink[]>(cache ?? []);
  useEffect(() => {
    let alive = true;
    fetch("/api/social", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d) { cache = d.links; setLinks(d.links); } })
      .catch(() => undefined);
    return () => { alive = false; };
  }, []);
  if (links.length === 0) return null;
  return (
    <div className={className}>
      {title && <p className="mb-1.5 text-xs font-semibold text-muted">{title}</p>}
      <ul className="flex flex-wrap gap-1.5">
        {links.map((l) => {
          const look = LOOK[l.kind] ?? LOOK.Other;
          return (
            <li key={l.id}>
              <a href={l.url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold text-white ${look.cls}`} title={l.kind}>
                <span aria-hidden="true">{look.icon}</span>{l.label || l.kind}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
