import { describe, expect, it } from "vitest";
import { createDb } from "@/db";
import { quickReplies } from "@/db/schema";
import { replySchema } from "@/lib/validation";
import { resourceFor } from "@/lib/admin";

describe("quick replies", () => {
  it("are seeded and editable through the admin resource", async () => {
    const db = await createDb({ dir: "memory://" });
    const rows = await db.select().from(quickReplies);
    expect(rows.length).toBeGreaterThanOrEqual(5);
    expect(rows.every((r) => r.title.length <= 30 && r.body.length > 0)).toBe(true);
    expect(resourceFor("replies").schema).toBeDefined();
  });
  it("validates title and message", () => {
    expect(replySchema.parse({ title: " Hi ", body: " Hello " })).toMatchObject({ title: "Hi", body: "Hello", sortOrder: 0 });
    expect(() => replySchema.parse({ title: "", body: "x" })).toThrow();
    expect(() => replySchema.parse({ title: "x", body: "" })).toThrow();
    expect(() => replySchema.parse({ title: "x".repeat(31), body: "x" })).toThrow();
  });
});
