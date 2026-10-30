import { NextResponse } from "next/server";
import { pushConfigured } from "@/lib/push";

/** The public key a browser needs to subscribe. enabled=false when the site owner has not set the keys up. */
export const GET = () => NextResponse.json({ enabled: pushConfigured(), key: pushConfigured() ? process.env.VAPID_PUBLIC_KEY : null });
