import { SPIN_COST } from "./config";

/** "2x", "0.4x", "20x": how a prize looks on the main wheel now that it scales with the bet. */
export function multiplierText(credits: number): string {
  const m = credits / SPIN_COST;
  return `${Number.isInteger(m) ? m : Math.round(m * 100) / 100}x`;
}

/**
 * Text printed on a wheel slice. The main wheel pays "credits x bet / 50", so a slice stored as 100 reads "2x" and the
 * jackpot reads "JACKPOT 20x". Free-text labels an admin typed (and the welcome wheel) are shown as they are.
 */
export function wheelLabel(seg: { label: string; credits: number }, kind: "main" | "welcome"): string {
  if (kind === "welcome" || seg.credits <= 0) return seg.label;
  if (/^jackpot/i.test(seg.label)) return `JACKPOT ${multiplierText(seg.credits)}`;
  if (seg.label.trim() === String(seg.credits)) return multiplierText(seg.credits);
  return seg.label;
}
