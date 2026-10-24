"use client";

import { useState } from "react";

export function RequestCredits() {
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState("");

  async function request() {
    setState("busy");
    setError("");
    try {
      const res = await fetch("/api/credits/request", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send the request.");
      setState("sent");
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
        {error || (state === "sent" ? "Request sent. The admin will answer in your chat." : "")}
      </p>
    </div>
  );
}
