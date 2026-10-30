"use client";

import { useEffect, useState } from "react";
import { disablePush, enablePush, pushState } from "@/lib/push-client";
import { Icon } from "./Icon";

/** "Turn on notifications": lets the phone buzz when the admin replies, even with the site closed. */
export function PushToggle({ className = "" }: { className?: string }) {
  const [state, setState] = useState<"hidden" | "off" | "on" | "blocked" | "busy" | "ios">("hidden");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    void pushState().then((s) => setState(s === "unsupported" ? "hidden" : s));
  }, []);

  async function enable() {
    setState("busy");
    setMsg("");
    try {
      setState(await enablePush());
    } catch {
      setMsg("Could not turn notifications on. Try again.");
      setState("off");
    }
  }

  async function disable() {
    setState("busy");
    try {
      await disablePush();
    } finally {
      setState("off");
    }
  }

  if (state === "hidden") return null;
  return (
    <div className={className}>
      {state === "ios" ? (
        <p className="text-xs text-muted">On iPhone, add the app to your Home Screen first to get notifications.</p>
      ) : state === "blocked" ? (
        <p className="text-xs text-muted">Notifications are blocked. Allow them for this site in your browser settings.</p>
      ) : (
        <button type="button" disabled={state === "busy"} onClick={state === "on" ? disable : enable} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-muted hover:bg-surface-2" aria-pressed={state === "on"}>
          <Icon name="chat" />
          {state === "on" ? "Notifications on (tap to turn off)" : "Turn on notifications"}
        </button>
      )}
      {msg && <p role="alert" className="px-3 text-xs text-danger">{msg}</p>}
    </div>
  );
}
