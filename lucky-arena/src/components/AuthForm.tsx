"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCurrencyWord } from "./Currency";
import { nextTrack, startMusic, unlockAudio } from "@/lib/music";

export function AuthForm({ mode, refCode, next, google = false, notice }: { mode: "login" | "register"; refCode?: string; next?: string; google?: boolean; notice?: string }) {
  const router = useRouter();
  const word = useCurrencyWord();
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isReg = mode === "register";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    unlockAudio(); // inside the click/submit so the browser allows the background music afterwards
    setError("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const body = isReg
      ? { email: f.get("email"), username: f.get("username"), password: f.get("password"), ref: refCode ?? null }
      : { identifier: f.get("identifier"), password: f.get("password") };
    try {
      const res = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      nextTrack(); // a different track each time you log in
      startMusic();
      if (next) {
        window.location.assign(next); // e.g. /play/<game>: carries on to the game the player tapped before signing in
        return;
      }
      router.push(data.role === "admin" ? "/admin" : "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card marquee mx-auto w-full max-w-md space-y-4 p-8">
      <h1 className="gold-text text-3xl font-extrabold uppercase">{isReg ? "Join the table" : "Welcome back"}</h1>
      {next && <p className="rounded-lg bg-surface-2 p-2 text-sm text-gold">Log in or sign up first, then you go straight to your game.</p>}
      {isReg && refCode && <p className="rounded-lg bg-surface-2 p-2 text-sm text-gold">{`Referral code ${refCode} applied: bonus ${word} for you and your friend.`}</p>}
      {isReg ? (
        <>
          <label className="block text-sm font-semibold">Gmail or Apple ID (email)
            <input name="email" type="email" required autoComplete="email" className="input mt-1" />
            <span className="mt-1 block text-xs font-normal text-muted">Gmail: tap "Continue with Google" below. Apple ID or any other email: type it here.</span>
          </label>
          <label className="block text-sm font-semibold">Username
            <input name="username" required minLength={3} maxLength={20} pattern="[A-Za-z0-9_]{3,20}" autoComplete="username" className="input mt-1" />
          </label>
        </>
      ) : (
        <label className="block text-sm font-semibold">Email or username
          <input name="identifier" required autoComplete="username" className="input mt-1" />
        </label>
      )}
      <label className="block text-sm font-semibold">Password
        <span className="relative mt-1 block">
          <input name="password" type={show ? "text" : "password"} required minLength={isReg ? 8 : 1} maxLength={72} autoComplete={isReg ? "new-password" : "current-password"} className="input !pr-12" />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted hover:text-ink"
          >
            {show ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
            )}
          </button>
        </span>
      </label>
      {(error || notice) && <p role="alert" className="text-sm font-semibold text-danger">{error || notice}</p>}
      {!isReg && <p className="text-right text-sm"><Link href="/forgot" className="tap text-gold underline">Forgot password?</Link></p>}
      <button className="btn btn-gold w-full" disabled={busy}>{busy ? "Please wait..." : isReg ? "Sign up" : "Log in"}</button>
      {(
        <>
          <div className="flex items-center gap-3 text-xs text-muted" aria-hidden="true"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
          <a
            href={`/api/auth/google/start?${new URLSearchParams({ ...(next ? { next } : {}), ...(refCode ? { ref: refCode } : {}) }).toString()}`}
            onClick={(e) => { if (!google) { e.preventDefault(); setError("Google sign-in is not switched on yet. The admin needs to add the Google keys first. Please use email for now."); } }}
            className="btn btn-ghost flex w-full items-center justify-center gap-2 bg-white !text-[#1f1f1f] hover:!bg-white/90"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" /><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" /><path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.100 0 24s.9 7.600 2.600 10.800l7.900-6.100z" /><path fill="#34A853" d="M24 48c6.300 0 11.600-2.100 15.500-5.700l-7.500-5.800c-2.100 1.400-4.800 2.300-8 2.300-6.300 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z" /></svg>
            Continue with Google
          </a>
        </>
      )}
      <p className="text-center text-sm text-muted">
        {isReg ? <>Already have an account? <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="tap text-gold underline">Log in</Link></> : <>New here? <Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"} className="tap text-gold underline">Create an account</Link></>}
      </p>
    </form>
  );
}
