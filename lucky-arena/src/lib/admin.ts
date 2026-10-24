import { and, count, eq, gt } from "drizzle-orm";
import type { z } from "zod";
import type { Db } from "@/db";
import { games, promotions, quickReplies, socialLinks, walletOptions, wheelSegments } from "@/db/schema";
import { AppError } from "./services";
import { gameSchema, promoSchema, replySchema, segmentSchema, socialSchema, walletOptionSchema } from "./validation";

const resources = {
  games: { table: games, schema: gameSchema },
  promos: { table: promotions, schema: promoSchema },
  wheel: { table: wheelSegments, schema: segmentSchema },
  replies: { table: quickReplies, schema: replySchema },
  social: { table: socialLinks, schema: socialSchema },
  wallet: { table: walletOptions, schema: walletOptionSchema },
} as const;

export function resourceFor(name: string) {
  if (!(name in resources)) throw new AppError("not_found", "Unknown resource.", 404);
  return resources[name as keyof typeof resources] as unknown as {
    // The three tables share the columns used generically here (id); typed as one for the query builder.
    table: typeof games;
    schema: z.ZodObject<z.ZodRawShape>;
  };
}

/** Each wheel (main and welcome) needs at least two active segments with a chance of landing, or spins would fail. */
export async function assertWheelPlayable(db: Db) {
  const rows = await db
    .select({ kind: wheelSegments.kind, value: count() })
    .from(wheelSegments)
    .where(and(eq(wheelSegments.active, true), gt(wheelSegments.weight, 0)))
    .groupBy(wheelSegments.kind);
  for (const kind of ["main", "welcome"]) {
    if ((rows.find((r) => r.kind === kind)?.value ?? 0) < 2) {
      throw new AppError("wheel_invalid", `Keep at least 2 active "${kind}" wheel segments with weight above 0.`);
    }
  }
}

/**
 * Validates a PATCH body by overlaying it on the stored row and parsing the result with the full schema.
 * (zod's `.partial()` would re-apply field defaults and silently reset columns the client did not send.)
 */
export function parsePatch(schema: z.ZodObject<z.ZodRawShape>, existing: Record<string, unknown>, body: unknown) {
  if (typeof body !== "object" || body === null || Array.isArray(body)) throw new AppError("invalid", "Invalid input.");
  return schema.parse({ ...existing, ...(body as Record<string, unknown>) });
}
