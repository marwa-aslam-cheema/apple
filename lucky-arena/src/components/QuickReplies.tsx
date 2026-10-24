"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface Reply {
  id: number;
  title: string;
  body: string;
  shortcut: string;
}

/** Saved admin messages: click one to drop it into the chat box (then press Send). */
export function QuickReplies() {
  const [items, setItems] = useState<Reply[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/replies", { cache: "no-store" });
      if (res.ok) setItems((await res.json()).items);
    } catch {
      /* offline: keep the list we have */
    }
  }, []);

  useEffect(() => {
    load();
    window.addEventListener("la:quick-changed", load);
    return () => window.removeEventListener("la:quick-changed", load);
  }, [load]);

  return (
    <div className="flex items-center gap-2 overflow-x-auto border-b border-line px-2 py-2" aria-label="Quick replies">
      {items.map((r) => (
        <button
          key={r.id}
          type="button"
          title={r.shortcut ? `${r.body}\n(shortcut: ${r.shortcut})` : r.body}
          className="chip shrink-0 hover:border-gold hover:text-ink"
          onClick={() => window.dispatchEvent(new CustomEvent("la:chat-fill", { detail: r.body }))}
        >
          {r.title}
        </button>
      ))}
      {items.length === 0 && <span className="text-xs text-muted">No quick replies yet.</span>}
      <Link href="/admin?tab=replies" className="chip shrink-0 !border-dashed" aria-label="Edit quick replies">Edit</Link>
    </div>
  );
}
