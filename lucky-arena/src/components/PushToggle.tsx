"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";

const toKey = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

/** "Turn on notifications": lets the phone buzz when the admin replies, even with the site closed. */
export function PushToggle({ className = "" }: { className?: string }) {
  const [state, setState] = useState<"hidden" | "off" | "on" | "blocked" | "busy" | "ios">("hidden");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setState(ios && !standalone ? "ios" : "hidden");
      try {
        const k = await (await fetch("/api/push/key")).json();
        if (!k.enabled) return; // the site owner has not set the keys: show nothing
        if (Notification.permission === "denied") return setState("blocked");
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        setState(sub && Notification.permission === "granted" ? "on" : "off");
      } catch {
        /* leave hidden */
      }
    })();
  }, []);

  async function enable() {
    setState("busy");
    setMsg("");
    try {
      const k = await (await fetch("/api/push/key")).json();
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState(perm === "denied" ? "blocked" : "off");
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(k.key) }));
      const res = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      if (!res.ok) throw new Error();
      setState("on");
    } catch {
      setMsg("Could not turn notifications on. Try again.");
      setState("off");
    }
  }

  async function disable() {
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
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
