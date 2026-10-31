"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { APP_BONUS_SPINS } from "@/lib/config";
import { enablePushWithSpins, pushState } from "@/lib/push-client";

const LATER = "la_notify_later";
const LATER_DAYS = 7;

/**
 * "Turn on notifications", asked once the welcome popup is out of the way. It only appears when this phone can get
 * notifications, has not been set up yet, and the player has not said "later" in the last week.
 */
export function NotifyPopup({ signedIn, role, bonus = false }: { signedIn: boolean; role: string; bonus?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const quiet = !signedIn || role === "admin" || ["/login", "/register", "/forgot", "/admin"].some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (quiet) return;
    try {
      if (Date.now() - Number(localStorage.getItem(LATER) ?? 0) < LATER_DAYS * 86400_000) return;
      if (sessionStorage.getItem("la_notify_shown")) return;
    } catch {
      /* private mode: ask anyway */
    }
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ask = async () => {
      if (!alive || (await pushState()) !== "off") return;
      setOpen(true);
      try {
        sessionStorage.setItem("la_notify_shown", "1");
      } catch {
        /* ignore */
      }
    };
    // After the welcome popup closes; if it never opens, after a few seconds.
    const onDone = () => { clearTimeout(timer); timer = setTimeout(ask, 600); };
    window.addEventListener("la:promo-done", onDone);
    timer = setTimeout(ask, 7000);
    return () => { alive = false; clearTimeout(timer); window.removeEventListener("la:promo-done", onDone); };
  }, [quiet]);

  function later() {
    setOpen(false);
    try {
      localStorage.setItem(LATER, String(Date.now()));
    } catch {
      /* ignore */
    }
  }

  async function turnOn() {
    setBusy(true);
    setMsg("");
    try {
      const r = await enablePushWithSpins();
      if (r.state === "on") {
        if (r.spins > 0) { setMsg(`🎉 ${r.spins} free spins added!`); router.refresh(); await new Promise((ok) => setTimeout(ok, 1800)); }
        return setOpen(false);
      }
      setMsg(r.state === "blocked" ? "Notifications are blocked in your browser settings for this site." : "Not turned on. You can do it later from the menu.");
    } catch {
      setMsg("Could not turn on. Try again later from the menu.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="Turn on notifications" className="fixed inset-0 z-[66] flex items-end justify-center p-4 sm:items-center">
      <button className="absolute inset-0 bg-black/75 backdrop-blur-sm" aria-label="Close" tabIndex={-1} onClick={later} />
      <div className="card marquee pop-in relative w-full max-w-sm overflow-hidden bg-gradient-to-br from-[#2a0b3d] via-[#1d0b1d] to-[#0d060f] p-8 text-center">
        <div className="spotlight pointer-events-none absolute inset-0" aria-hidden="true" />
        <p className="coin-bounce relative text-5xl" aria-hidden="true">🔔</p>
        <h2 className="gold-text relative mt-3 text-2xl font-extrabold uppercase">Turn on notifications</h2>
        {bonus && <p className="relative mt-2 text-lg font-extrabold text-gold">{`Turn on notifications and get ${APP_BONUS_SPINS} free spins!`}</p>}
        <p className="relative mt-2 text-sm text-muted">Get a buzz on your phone when the admin replies or a new offer arrives, even when the app is closed.</p>
        <button className="btn btn-gold shine relative mt-5 w-full text-lg" disabled={busy} onClick={turnOn}>{busy ? "Please wait..." : "Turn on notifications"}</button>
        <button className="tap relative mt-2 text-xs text-muted underline" onClick={later}>Maybe later</button>
        {msg && <p role="alert" className="relative mt-2 text-sm font-semibold text-danger">{msg}</p>}
      </div>
    </div>
  );
}
