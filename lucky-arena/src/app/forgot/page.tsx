import type { Metadata } from "next";
import { ForgotForm } from "@/components/ForgotForm";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPage() {
  return <ForgotForm />;
}
