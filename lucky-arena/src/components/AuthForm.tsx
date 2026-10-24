"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AuthForm({ mode, refCode }: { mode: "login" | "register"; refCode?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isReg = mode === "register";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
      router.push(data.role === "admin" ? "/admin" : "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card mx-auto w-full max-w-md space-y-4 p-6">
      <h1 className="text-2xl font-extrabold">{isReg ? "Create your account" : "Welcome back"}</h1>
      {isReg && <p className="text-sm text-muted">Start at zero and spin the free welcome wheel for your first demo credits. No payment details needed, ever.</p>}
      {isReg && refCode && <p className="rounded-lg bg-surface-2 p-2 text-sm text-gold">Referral code {refCode} applied: bonus credits for you and your friend.</p>}
      {isReg ? (
        <>
          <label className="block text-sm font-semibold">Email
            <input name="email" type="email" required autoComplete="email" className="input mt-1" />
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
        <input name="password" type="password" required minLength={isReg ? 8 : 1} maxLength={72} autoComplete={isReg ? "new-password" : "current-password"} className="input mt-1" />
      </label>
      {error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}
      {!isReg && <p className="text-right text-sm"><Link href="/forgot" className="text-gold underline">Forgot password?</Link></p>}
      <button className="btn btn-gold w-full" disabled={busy}>{busy ? "Please wait..." : isReg ? "Sign up" : "Log in"}</button>
      <p className="text-center text-sm text-muted">
        {isReg ? <>Already have an account? <Link href="/login" className="text-gold underline">Log in</Link></> : <>New here? <Link href="/register" className="text-gold underline">Create an account</Link></>}
      </p>
    </form>
  );
}
