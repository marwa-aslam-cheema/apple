import type { Metadata } from "next";
import { ChatScreen } from "@/components/ChatScreen";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Support Chat" };

/** The chat as a page: signed-in players use their own thread, visitors the signed-out support thread. */
export default async function ChatPage() {
  const user = await getCurrentUser();
  return <ChatScreen url={user ? "/api/chat" : "/api/guest/chat"} mine="user" allowImages={!!user} signedIn={!!user} />;
}
