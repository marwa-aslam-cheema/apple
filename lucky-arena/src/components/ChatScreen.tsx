"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChatBox } from "./ChatBox";
import { SocialBar } from "./SocialBar";

/**
 * The support chat as a page. On a phone it fills the screen like Messenger (a Back button on top, the bottom bar stays);
 * on a computer it is a card in the page.
 */
export function ChatScreen({ url, mine, allowImages, signedIn }: { url: string; mine: "user"; allowImages: boolean; signedIn: boolean }) {
  const router = useRouter();
  const back = () => (window.history.length > 1 ? router.back() : router.push("/"));
  return (
    <div className="chat-screen flex h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] flex-col lg:mx-auto lg:h-auto lg:max-w-2xl lg:space-y-4">
      <header className="flex items-center gap-2 border-b border-line bg-surface px-2 py-2 lg:hidden">
        <button type="button" onClick={back} className="flex h-10 w-10 items-center justify-center rounded-full text-xl hover:bg-surface-2" aria-label="Back">&larr;</button>
        <div className="min-w-0 flex-1">
          <b className="block truncate">Support chat</b>
          <span className="block truncate text-xs text-muted">We reply here</span>
        </div>
      </header>
      <header className="hidden lg:block">
        <h1 className="text-2xl font-extrabold">Support chat</h1>
        <p className="mt-1 text-sm text-muted">Message the team about your account, your password or anything else. Replies appear here. Never share your password in chat.</p>
      </header>
      {!signedIn && (
        <p className="border-b border-line bg-surface-2/60 px-3 py-2 text-xs text-muted lg:rounded-xl lg:border">
          Forgot your password? <Link href="/forgot" className="font-bold text-gold underline">Send a reset request</Link> and the admin will reply here.
        </p>
      )}
      <SocialBar className="px-3 py-2 lg:px-0 lg:py-0" title="" />
      <div className="min-h-0 flex-1 lg:card lg:flex-none lg:overflow-hidden">
        <ChatBox url={url} mine={mine} allowImages={allowImages} className="h-full lg:h-[28rem] lg:max-h-[70vh]" />
      </div>
    </div>
  );
}
