"use client";

import { useState } from "react";

export function RequestCredits() {
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  async function request() {
    setState("busy");
    setError("");
    setNote("");
    try {
      const res = await fetch("/api/credits/request", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send the request.");
      setState("sent");
      if (data.reason === "already_requested") setNote("You already asked. The admin will answer in your chat.");
      window.dispatchEvent(new Event("la:open-chat")); // open the chat bubble so the player sees the conversation
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the request.");
      setState("idle");
    }
  }

  return (
    <div>
      <button className="btn btn-gold w-full sm:w-auto" onClick={request} disabled={state === "busy"}>
        {state === "busy" ? "Sending..." : "Request credits"}
      </button>
      <p role="status" className={`mt-2 min-h-5 text-sm font-semibold ${error ? "text-danger" : "text-teal"}`}>
        {error || (state === "sent" ? note || "Request sent. The admin will answer in your chat." : "")}
      </p>
    </div>
  );
}
