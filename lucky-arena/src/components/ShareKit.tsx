"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";

/** Ready-made invite post: picture, caption, and share buttons. */
export function ShareKit({ code, caption: initialCaption, image: customImage, bonus, siteName, linkBase = "" }: { code: string; caption: string; image: string; bonus: string; siteName: string; linkBase?: string }) {
  const [origin, setOrigin] = useState("");
  const [caption, setCaption] = useState(initialCaption);
  const [bonusCopied, setBonusCopied] = useState(false);
  useEffect(() => setCaption(initialCaption), [initialCaption]); // a new code (or new wording from the admin) reaches the caption box
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    setOrigin(window.location.origin);
    setCanShare(typeof navigator.share === "function");
  }, []);

  const link = `${linkBase || origin}/register?ref=${code}`;
  const image = customImage || `/invite/image?code=${code}`;
  const downloadHref = customImage || `${image}&download=1`;
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
      <img src={image} alt={`Invite post: join ${siteName} and get free spins`} className="h-auto w-full rounded-2xl border border-line" />
      <div className="space-y-4">
        {bonus && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-gold/50 bg-surface-2/60 px-3 py-2">
            <div className="min-w-0">
              <p className="text-xs text-muted">Free chips code</p>
              <code className="block truncate text-lg font-extrabold text-gold">{bonus}</code>
            </div>
            <button type="button" className="chip shrink-0 hover:border-gold" onClick={async () => { try { await navigator.clipboard.writeText(bonus); setBonusCopied(true); setTimeout(() => setBonusCopied(false), 1800); } catch { /* clipboard blocked */ } }}>
              <Icon name="copy" className="h-4 w-4" />{bonusCopied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}
        <label className="block text-sm font-semibold">Caption (edit it if you like)
          <textarea className="input mt-1 min-h-28" value={caption} maxLength={400} onChange={(e) => setCaption(e.target.value)} />
        </label>
        <div className="flex flex-wrap gap-2">
          <a className="btn btn-gold" href={downloadHref} download>Download picture</a>
          <button className="btn btn-violet" onClick={copy}><Icon name="copy" className="h-4 w-4" />{copied ? "Copied!" : "Copy caption and link"}</button>
          {canShare && (
            <button className="btn btn-ghost" onClick={() => navigator.share({ title: siteName, text: caption, url: link }).catch(() => undefined)}>Share...</button>
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
