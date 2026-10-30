import { describe, expect, it } from "vitest";
import { expectedReturn, payout, pickSegment } from "@/lib/wheel";
import { tierForXp } from "@/lib/vip";

const segs = [
  { id: 1, label: "a", credits: 0, weight: 3 },
  { id: 2, label: "b", credits: 100, weight: 1 },
  { id: 3, label: "off", credits: 999, weight: 0 },
];

describe("wheel", () => {
  it("maps rolls onto weighted segments deterministically", () => {
    expect(pickSegment(segs, () => 0).id).toBe(1);
    expect(pickSegment(segs, () => 2).id).toBe(1);
    expect(pickSegment(segs, () => 3).id).toBe(2);
  });
  it("never picks a zero-weight segment", () => {
    for (let i = 0; i < 500; i++) expect(pickSegment(segs).id).not.toBe(3);
  });
  it("throws with nothing to pick", () => {
    expect(() => pickSegment([{ id: 1, label: "x", credits: 1, weight: 0 }])).toThrow();
  });
  it("computes expected return", () => {
    expect(expectedReturn(segs, 50)).toBeCloseTo(0.5);
  });
});

describe("vip", () => {
  it("finds tiers and progress", () => {
    expect(tierForXp(0).tier.name).toBe("Bronze");
    expect(tierForXp(100).tier.name).toBe("Silver");
    expect(tierForXp(99999).tier.name).toBe("Diamond");
    expect(tierForXp(50).progress).toBeCloseTo(0.5);
  });
});

import { parsePatch } from "@/lib/admin";
import { gameSchema } from "@/lib/validation";

describe("admin patch", () => {
  const existing = { id: 5, slug: "abc", title: "T", category: "Arcade", description: "keep me", hue: 100, featured: false, playable: false, active: true, sortOrder: 7 };
  it("keeps unsent fields instead of resetting them to defaults", () => {
    const out = parsePatch(gameSchema as never, existing, { featured: true });
    expect(out).toMatchObject({ featured: true, hue: 100, description: "keep me", sortOrder: 7 });
  });
  it("still validates the merged result", () => {
    expect(() => parsePatch(gameSchema as never, existing, { slug: "BAD SLUG" })).toThrow();
    expect(() => parsePatch(gameSchema as never, existing, null)).toThrow();
  });
});

describe("game link", () => {
  const base = { slug: "my-game", title: "My Game", category: "Arcade" };
  it("accepts empty and http(s) links", () => {
    expect(gameSchema.parse(base).link).toBe("");
    expect(gameSchema.parse({ ...base, link: "https://example.com/play" }).link).toBe("https://example.com/play");
  });
  it("rejects script and data links", () => {
    expect(() => gameSchema.parse({ ...base, link: "javascript:alert(1)" })).toThrow();
    expect(() => gameSchema.parse({ ...base, link: "data:text/html,hi" })).toThrow();
    expect(() => gameSchema.parse({ ...base, link: "example.com" })).toThrow();
  });
});

describe("game image", () => {
  const base = { slug: "my-game", title: "My Game", category: "Arcade" };
  it("accepts http(s) image links only", () => {
    expect(gameSchema.parse({ ...base, image: "https://example.com/a.png" }).image).toBe("https://example.com/a.png");
    expect(gameSchema.parse(base).image).toBe("");
    expect(() => gameSchema.parse({ ...base, image: "javascript:alert(1)" })).toThrow();
  });
});

describe("payout scales with the bet", () => {
  it("pays credits x bet / reference bet", () => {
    expect(payout(100, 50, 50)).toBe(100); // the reference bet pays the listed prize
    expect(payout(100, 100, 50)).toBe(200);
    expect(payout(1000, 1000, 50)).toBe(20000);
    expect(payout(0, 500, 50)).toBe(0);
  });
  it("is exact in expectation for every bet: the wheel return does not change with the bet", () => {
    for (const credits of [10, 20, 40, 60, 80, 100, 150, 200, 500, 1000]) {
      for (const bet of [1, 2, 3, 7, 13, 49, 50, 51, 99, 250, 777, 1000]) {
        let sum = 0;
        for (let r = 0; r < 50; r++) sum += payout(credits, bet, 50, () => r); // every possible roll once
        expect(sum / 50).toBeCloseTo((credits * bet) / 50, 10);
      }
    }
  });
  it("pays a whole credit with the right chance when the prize is fractional", () => {
    expect(payout(10, 1, 50, () => 0)).toBe(1); // 0.2 credits: wins 1 on rolls 0..9
    expect(payout(10, 1, 50, () => 9)).toBe(1);
    expect(payout(10, 1, 50, () => 10)).toBe(0);
  });
});
