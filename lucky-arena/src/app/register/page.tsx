import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Sign up" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  if (await getCurrentUser()) redirect("/");
  const { ref } = await searchParams;
  return <AuthForm mode="register" refCode={ref?.slice(0, 20).toUpperCase()} />;
}
