import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, isUniqueViolation } from "./services";

/** Wraps a route handler: AppError and validation errors become clean JSON responses. */
export function route<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof AppError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
      if (isUniqueViolation(e)) return NextResponse.json({ error: "That value is already used. Pick another one.", code: "duplicate" }, { status: 409 });
      if (e instanceof ZodError) {
        return NextResponse.json({ error: e.issues[0]?.message ?? "Invalid input.", code: "invalid" }, { status: 400 });
      }
      console.error(e);
      return NextResponse.json({ error: "Something went wrong.", code: "server_error" }, { status: 500 });
    }
  };
}

/** Tiny in-memory limiter (per server instance). Good enough for a prototype; use Redis for production. */
const hits = new Map<string, { n: number; reset: number }>();
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < now) {
    hits.set(key, { n: 1, reset: now + windowMs });
    return;
  }
  if (++h.n > max) throw new AppError("rate_limited", "Too many attempts. Please wait a minute.", 429);
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
