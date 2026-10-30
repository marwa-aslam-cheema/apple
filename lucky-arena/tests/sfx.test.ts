import { describe, expect, it } from "vitest";
import { WHEEL_EASE, tickTimes } from "@/lib/sfx-synth";
import { TRACKS, barSeconds } from "@/lib/lounge";

describe("wheel ticks", () => {
  const delta = 5 * 360 + 200;
  const sa = 45;
  const ticks = tickTimes(delta, sa, 4.8);
  it("has one tick per segment passed", () => {
    expect(ticks.length).toBeGreaterThanOrEqual(Math.floor(delta / sa) - 1);
    expect(ticks.length).toBeLessThanOrEqual(Math.floor(delta / sa));
  });
  it("is increasing and slows down", () => {
    expect(ticks.every((t, i) => i === 0 || t > ticks[i - 1])).toBe(true);
    const first = ticks[1] - ticks[0];
    const last = ticks[ticks.length - 1] - ticks[ticks.length - 2];
    expect(last).toBeGreaterThan(first * 3);
  });
  it("easing runs from 0 to 1", () => {
    expect(WHEEL_EASE(0)).toBeCloseTo(0, 2);
    expect(WHEEL_EASE(1)).toBeCloseTo(1, 2);
  });
});

describe("music tracks", () => {
  it("has four distinct, well-formed tracks", () => {
    expect(TRACKS).toHaveLength(4);
    expect(new Set(TRACKS.map((t) => t.name)).size).toBe(4);
    for (const t of TRACKS) {
      expect(t.chords).toHaveLength(4);
      expect(barSeconds(t)).toBeGreaterThan(2);
      expect(t.chords.every((c) => c.notes.length >= 3 && c.bass < 60)).toBe(true);
    }
  });
});
