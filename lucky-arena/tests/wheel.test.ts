import { describe, expect, it } from "vitest";
import { expectedReturn, pickSegment } from "@/lib/wheel";
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
    expect(tierForXp(200).tier.name).toBe("Silver");
    expect(tierForXp(99999).tier.name).toBe("Diamond");
    expect(tierForXp(100).progress).toBeCloseTo(0.5);
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
