import type { Metadata } from "next";
import { ChatBox } from "@/components/ChatBox";
import { requireUserPage } from "@/lib/session";

export const metadata: Metadata = { title: "Support Chat" };

export default async function ChatPage() {
  await requireUserPage();
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold">Support chat</h1>
        <p className="mt-1 text-sm text-muted">Message the team about your account, your password or anything else. Replies appear here. Never share your password in chat.</p>
      </header>
      <div className="card overflow-hidden">
        <ChatBox url="/api/chat" mine="user" />
      </div>
    </div>
  );
}
