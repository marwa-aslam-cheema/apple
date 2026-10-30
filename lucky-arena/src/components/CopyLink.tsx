"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";

export function CopyLink({ code, base = "" }: { code: string; base?: string }) {
  const [url, setUrl] = useState(`/register?ref=${code}`);
  const [copied, setCopied] = useState(false);
  useEffect(() => setUrl(`${base || window.location.origin}/register?ref=${code}`), [code, base]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: the link is still selectable */
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input readOnly value={url} className="input flex-1 text-sm" aria-label="Your referral link" onFocus={(e) => e.currentTarget.select()} />
      <button className="btn btn-violet" onClick={copy}><Icon name="copy" className="h-4 w-4" />{copied ? "Copied!" : "Copy link"}</button>
    </div>
  );
}
