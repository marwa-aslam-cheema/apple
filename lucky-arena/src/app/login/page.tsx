import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  return <AuthForm mode="login" />;
}
