"use client";

import Link from "next/link";
import { useState } from "react";

export function ForgotForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const identifier = new FormData(e.currentTarget).get("identifier");
    try {
      const res = await fetch("/api/auth/forgot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="card mx-auto w-full max-w-md space-y-3 p-6">
        <h1 className="text-2xl font-extrabold">Request sent</h1>
        <p className="text-sm text-muted">If that account exists, the admin has been notified and will send you a new password. Keep your email or username handy so they can confirm it is you.</p>
        <Link href="/login" className="btn btn-gold">Back to log in</Link>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="card mx-auto w-full max-w-md space-y-4 p-6">
      <h1 className="text-2xl font-extrabold">Forgot password</h1>
      <p className="text-sm text-muted">Enter your email or username. The admin will get your request and set a new password for you.</p>
      <label className="block text-sm font-semibold">Email or username
        <input name="identifier" required maxLength={120} className="input mt-1" autoComplete="username" />
      </label>
      {error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}
      <button className="btn btn-gold w-full" disabled={busy}>{busy ? "Sending..." : "Send request"}</button>
      <p className="text-center text-sm"><Link href="/login" className="tap text-gold underline">Back to log in</Link></p>
    </form>
  );
}
