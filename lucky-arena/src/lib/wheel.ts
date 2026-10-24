import { randomInt } from "node:crypto";

export interface SegmentLike {
  id: number;
  label: string;
  credits: number;
  weight: number;
}

/** Weighted pick using a cryptographically secure RNG. Throws if there is nothing to pick. */
export function pickSegment<T extends SegmentLike>(segments: T[], rand: (max: number) => number = randomInt): T {
  const pool = segments.filter((s) => s.weight > 0);
  const total = pool.reduce((sum, s) => sum + s.weight, 0);
  if (pool.length === 0 || total <= 0) throw new Error("No active wheel segments");
  let roll = rand(total);
  for (const s of pool) {
    if (roll < s.weight) return s;
    roll -= s.weight;
  }
  return pool[pool.length - 1];
}

/** Expected return per spin as a fraction of the cost (informational for the admin). */
export function expectedReturn(segments: SegmentLike[], cost: number): number {
  const pool = segments.filter((s) => s.weight > 0);
  const total = pool.reduce((sum, s) => sum + s.weight, 0);
  if (!total || cost <= 0) return 0;
  return pool.reduce((sum, s) => sum + (s.credits * s.weight) / total, 0) / cost;
}
