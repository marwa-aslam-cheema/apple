"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";

/** Ready-made invite post: picture, caption, and share buttons. */
export function ShareKit({ code }: { code: string }) {
  const [origin, setOrigin] = useState("");
  const [caption, setCaption] = useState(`Join me on Lucky Arena and get FREE SPINS! 🎰✨ Spin the welcome wheel and play with friends. Play-money fun, no cash prizes. Use my code ${code}:`);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    setOrigin(window.location.origin);
    setCanShare(typeof navigator.share === "function");
  }, []);

  const link = `${origin}/register?ref=${code}`;
  const image = `/invite/image?code=${code}`;
  const enc = encodeURIComponent;
  const targets = [
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(link)}` },
    { name: "WhatsApp", href: `https://wa.me/?text=${enc(`${caption} ${link}`)}` },
    { name: "Telegram", href: `https://t.me/share/url?url=${enc(link)}&text=${enc(caption)}` },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${caption} ${link}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: the text can still be selected by hand */
    }
  }

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,18rem)_1fr]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt="Invite post: join Lucky Arena and get free spins" width={1080} height={1080} className="w-full rounded-2xl border border-line" />
      <div className="space-y-4">
        <label className="block text-sm font-semibold">Caption (edit it if you like)
          <textarea className="input mt-1 min-h-28" value={caption} maxLength={400} onChange={(e) => setCaption(e.target.value)} />
        </label>
        <div className="flex flex-wrap gap-2">
          <a className="btn btn-gold" href={`${image}&download=1`} download>Download picture</a>
          <button className="btn btn-violet" onClick={copy}><Icon name="copy" className="h-4 w-4" />{copied ? "Copied!" : "Copy caption and link"}</button>
          {canShare && (
            <button className="btn btn-ghost" onClick={() => navigator.share({ title: "Lucky Arena", text: caption, url: link }).catch(() => undefined)}>Share...</button>
          )}
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Share on">
          {targets.map((t) => (
            <a key={t.name} className="chip hover:border-gold hover:text-ink" href={t.href} target="_blank" rel="noopener noreferrer">{t.name}</a>
          ))}
        </div>
        <p className="text-xs text-muted">Facebook only lets the link be pre-filled, so paste the caption yourself (use "Copy caption and link"). When the site is online, the link shows this picture as its preview.</p>
      </div>
    </div>
  );
}
