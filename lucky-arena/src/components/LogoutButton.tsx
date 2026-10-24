"use client";

import { useRouter } from "next/navigation";
import { stopMusic } from "@/lib/music";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="btn btn-ghost"
      onClick={async () => {
        stopMusic();
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
