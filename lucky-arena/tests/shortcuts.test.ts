import { describe, expect, it } from "vitest";
import { createDb } from "@/db";
import { quickReplies } from "@/db/schema";
import { buildMap, expandShortcut } from "@/lib/shortcuts";
import { replySchema } from "@/lib/validation";

describe("shortcut expansion", () => {
  const map = buildMap([{ shortcut: "OK", body: "you are so cool person" }, { shortcut: "", body: "no shortcut" }, { shortcut: "/thx", body: "thanks!" }]);
  it("fills the saved text when the box holds only the shortcut", () => {
    expect(expandShortcut("ok", map)).toBe("you are so cool person");
    expect(expandShortcut("OK", map)).toBe("you are so cool person");
    expect(expandShortcut(" ok ", map)).toBe("you are so cool person");
    expect(expandShortcut("/thx", map)).toBe("thanks!");
  });
  it("leaves everything else alone", () => {
    expect(expandShortcut("o", map)).toBeNull();
    expect(expandShortcut("okay", map)).toBeNull();
    expect(expandShortcut("ok then", map)).toBeNull();
    expect(expandShortcut("", map)).toBeNull();
    expect(expandShortcut("constructor", map)).toBeNull();
    expect(expandShortcut("__proto__", map)).toBeNull();
  });
});

describe("shortcut field", () => {
  it("is lower-cased, optional and cannot hold spaces", () => {
    expect(replySchema.parse({ title: "t", body: "b", shortcut: " OK " }).shortcut).toBe("ok");
    expect(replySchema.parse({ title: "t", body: "b" }).shortcut).toBe("");
    expect(() => replySchema.parse({ title: "t", body: "b", shortcut: "two words" })).toThrow();
    expect(() => replySchema.parse({ title: "t", body: "b", shortcut: "x".repeat(21) })).toThrow();
  });
  it("is unique across replies and the seeded replies have shortcuts", async () => {
    const db = await createDb({ dir: "memory://" });
    const rows = await db.select().from(quickReplies);
    expect(rows.every((r) => r.shortcut.startsWith("/"))).toBe(true);
    await db.insert(quickReplies).values({ title: "A", body: "a", shortcut: "ok" });
    await expect(db.insert(quickReplies).values({ title: "B", body: "b", shortcut: "ok" })).rejects.toThrow();
    await db.insert(quickReplies).values({ title: "C", body: "c" }); // empty shortcuts may repeat
    await db.insert(quickReplies).values({ title: "D", body: "d" });
  });
});
