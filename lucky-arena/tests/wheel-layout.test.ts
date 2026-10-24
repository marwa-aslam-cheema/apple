import { beforeAll, describe, expect, it } from "vitest";
import { createDb, type Db } from "@/db";
import { seed } from "@/db/seed";
import { wheelSegments } from "@/db/schema";
import { activeWheel } from "@/lib/services";
import { SPIN_COST } from "@/lib/config";
import { chordAt, fits, segmentLayout, splitLabel } from "@/lib/wheel-layout";
import { expectedReturn } from "@/lib/wheel";
import { eq } from "drizzle-orm";

let db: Db;
beforeAll(async () => {
  db = await createDb({ dir: "memory://" });
});

describe("wheel layout", () => {
  it("splits long labels over two lines", () => {
    expect(splitLabel("JACKPOT 1000")).toEqual(["JACKPOT", "1000"]);
    expect(splitLabel("Try next time")).toEqual(["Try next", "time"]);
    expect(splitLabel("20")).toEqual(["20"]);
  });
  it("keeps every seeded label and icon inside its own slice", async () => {
    for (const kind of ["main", "welcome"] as const) {
      const segs = await activeWheel(db, kind);
      const sa = 360 / segs.length;
      for (const s of segs) expect(fits(s.label, sa), `${kind}: ${s.label}`).toBe(true);
    }
  });
  it("squeezes over-long text instead of letting it spill", () => {
    const l = segmentLayout("SUPER MEGA JACKPOT", 30);
    expect(l.squeezed).toBe(true);
    expect(l.textLength).toBeLessThanOrEqual(l.textOuter - l.textInner);
    expect(chordAt(48, 30)).toBeGreaterThan(20);
  });
});

describe("seeded wheels", () => {
  it("main wheel has 12 slices, a jackpot with its own icon, and returns less than the spin cost", async () => {
    const segs = await activeWheel(db, "main");
    expect(segs).toHaveLength(12);
    expect(segs.every((s) => s.icon !== "")).toBe(true);
    expect(segs.find((s) => s.credits >= 1000)?.icon).toBe("🎰");
    expect(expectedReturn(segs, SPIN_COST)).toBeLessThan(1);
    expect(expectedReturn(segs, SPIN_COST)).toBeGreaterThan(0.6);
  });
  it("welcome wheel segments have icons", async () => {
    expect((await activeWheel(db, "welcome")).every((s) => s.icon !== "")).toBe(true);
  });
  it("upgrades the first release's plain 8-slice wheel, but not a customised one", async () => {
    const old = ["Try Again", "20", "40", "80", "Try Again", "120", "300", "JACKPOT 1000"];
    await db.delete(wheelSegments).where(eq(wheelSegments.kind, "main"));
    await db.insert(wheelSegments).values(old.map((label, i) => ({ label, credits: i, weight: 1, kind: "main", sortOrder: i })));
    await seed(db);
    expect(await activeWheel(db, "main")).toHaveLength(12);
    // an admin-edited wheel (has icons) is left alone
    await db.update(wheelSegments).set({ label: "Mine" }).where(eq(wheelSegments.credits, 10));
    await seed(db);
    expect((await activeWheel(db, "main")).some((s) => s.label === "Mine")).toBe(true);
  });
});
