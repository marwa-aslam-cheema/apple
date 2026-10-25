import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { googleEnabled } from "@/lib/google";
import { safeNext } from "@/lib/safe-next";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getCurrentUser()) redirect(next ?? "/");
  const notice = sp.error === "banned" ? "This account is suspended." : sp.error === "slow" ? "Please wait a moment and try again." : sp.error ? "Google sign-in did not work. Please try again." : undefined;
  return <AuthForm mode="login" next={next} google={googleEnabled()} notice={notice} />;
}
