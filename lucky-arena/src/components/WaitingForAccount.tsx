"use client";

import { useEffect } from "react";

/** Shown after a linked game was tapped without a username: the admin has been asked, the chat opens. */
export function WaitingForAccount() {
  useEffect(() => { window.dispatchEvent(new Event("la:open-chat")); }, []);
  return (
    <p role="status" className="card border-gold/60 p-4 text-sm">
      The admin has been asked for your username and password for this game. You will get them in the chat, then you can play.
    </p>
  );
}
