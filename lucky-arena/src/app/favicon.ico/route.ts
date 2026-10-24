import { NextResponse } from "next/server";

// Browsers ask for /favicon.ico by habit; point them at the real icon instead of a 404.
export function GET(req: Request) {
  return NextResponse.redirect(new URL("/icon.svg", req.url), 308);
}
