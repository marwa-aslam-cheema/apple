"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Keeps an open page (also the Home Screen app) up to date: when the admin changes games, promotions, the wheel or social
 * links, the page reloads its data by itself within a few seconds. No pull-to-refresh needed.
 */
export function LiveRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  const seen = useRef<number | null>(null);
  const path = useRef(pathname);
  path.current = pathname;

  useEffect(() => {
    let alive = true;
    async function check() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok || !alive) return;
        const { v } = (await res.json()) as { v: number };
        if (seen.current !== null && v !== seen.current) {
          window.dispatchEvent(new Event("la:content-changed"));
          // Not in the middle of a spin or while the admin is typing in a form: those pages load fresh data on their own.
          if (!path.current.startsWith("/spin") && !path.current.startsWith("/admin")) router.refresh();
        }
        seen.current = v;
      } catch {
        /* offline: try again next time */
      }
    }
    void check();
    const t = setInterval(check, 8000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      alive = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [router]);
  return null;
}
