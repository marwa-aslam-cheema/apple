"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChipIcon } from "./Logo";

interface Regular { enabled: boolean; title: string; text: string; button: string; message: string }
interface Popup { enabled: boolean; title: string; text: string; button: string; buttonMember: string; timerHours: number }

const SEEN = "la_promo_popup_seen";

/**
 * Welcome popup, once per visit. Visitors without an account get "Claim signup bonus" (goes to sign up); players who
 * already have one get "I want a top-up", which sends the request straight to the admin's chat. Texts are the admin's.
 */
export function PromoPopup({ signedIn, role, createdAt = 0, signupClaimed = false }: { signedIn: boolean; role: string; createdAt?: number; signupClaimed?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [popup, setPopup] = useState<Popup | null>(null);
  const [regular, setRegular] = useState<Regular | null>(null);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  // A player whose account was made in the last 15 minutes gets the welcome popup (WelcomeBonusPopup) instead of this one.
  const brandNew = signedIn && createdAt > 0 && Date.now() - createdAt < 15 * 60_000;
  // Visitors on the home page already have the same offer written on the page.
  const quiet = brandNew || role === "admin" || ["/login", "/register", "/forgot", "/admin"].some((p) => pathname.startsWith(p)) || (!signedIn && pathname === "/");

  useEffect(() => {
    if (quiet) return;
    try {
      if (sessionStorage.getItem(SEEN)) { window.dispatchEvent(new Event("la:promo-done")); return; }
    } catch {
      /* private mode: it may show again on the next page, which is fine */
    }
    let alive = true;
    const t = setTimeout(() => {
      fetch("/api/promo", { cache: "no-store" })
        .then((r) => r.json())
        .then((d: { popup: Popup; regular: Regular }) => {
          if (!alive) return;
          // A player who has claimed the sign-up bonus is shown the admin's Regular Bonus; the sign-up offer never comes back for them.
          const shown = signedIn && signupClaimed ? { enabled: d.regular.enabled, title: d.regular.title, text: d.regular.text, button: d.regular.button, buttonMember: d.regular.button, timerHours: 0 } : d.popup;
          if (shown.enabled) { setPopup(shown); setRegular(signedIn && signupClaimed ? d.regular : null); setOpen(true); } else window.dispatchEvent(new Event("la:promo-done"));
        })
        .catch(() => undefined);
    }, 1200);
    return () => { alive = false; clearTimeout(t); };
  }, [quiet]);

  function close() {
    setOpen(false);
    try {
      sessionStorage.setItem(SEEN, "1");
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event("la:promo-done")); // the notifications popup comes next
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function go() {
    if (!signedIn) {
      close();
      router.push("/register");
      return;
    }
    setNote("");
    try {
      await fetch("/api/credits/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(regular ? { regular: true } : { signup: true }) });
      close();
      window.dispatchEvent(new Event("la:open-chat")); // the player sees the message that went to the admin
    } catch {
      setNote("Could not send. Try again.");
    }
  }

  if (!open || !popup) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label={popup.title} className="fixed inset-0 z-[65] flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/75 backdrop-blur-sm" aria-label="Close" tabIndex={-1} onClick={close} />
      <div className="card marquee pop-in relative w-full max-w-sm overflow-hidden bg-gradient-to-br from-[#4a0b26] via-[#1d0b1d] to-[#0d060f] p-8 text-center">
        <div className="spotlight pointer-events-none absolute inset-0" aria-hidden="true" />
        <button className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-muted hover:bg-black/30 hover:text-ink" aria-label="Close" onClick={close}>×</button>
        <div className="relative flex items-end justify-center gap-2" aria-hidden="true">
          <span className="coin-bounce" style={{ animationDelay: "0s" }}><ChipIcon size={34} /></span>
          <span className="coin-bounce text-5xl" style={{ animationDelay: ".25s" }}>🎰</span>
          <span className="coin-bounce" style={{ animationDelay: ".5s" }}><ChipIcon size={34} /></span>
        </div>
        <h2 className="gold-text relative mt-3 text-3xl font-extrabold uppercase">{popup.title}</h2>
        {popup.text && <p className="relative mt-2 text-lg font-semibold text-ink">{popup.text}</p>}
        <button className="btn btn-gold shine relative mt-6 w-full text-lg" onClick={go}>{signedIn ? popup.buttonMember : popup.button}</button>
        <button className="tap relative mt-2 text-xs text-muted underline" onClick={close}>Maybe later</button>
        {note && <p role="alert" className="relative mt-2 text-sm font-semibold text-danger">{note}</p>}
      </div>
    </div>
  );
}
