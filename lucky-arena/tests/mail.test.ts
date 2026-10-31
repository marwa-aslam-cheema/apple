import { describe, expect, it } from "vitest";
import { createDb } from "@/db";
import { mailConfig, saveMailAccount } from "@/lib/mail";
import { settings } from "@/db/schema";

describe("email account", () => {
  it("keeps the app password scrambled and keeps it when left empty", async () => {
    const db = await createDb({ dir: "memory://" });
    expect((await mailConfig(db)).enabled).toBe(false);
    await saveMailAccount(db, "boss@gmail.com", "abcd efgh ijkl mnop");
    const c = await mailConfig(db);
    expect(c).toMatchObject({ user: "boss@gmail.com", pass: "abcdefghijklmnop", gmail: true, enabled: true });
    const raw = (await db.select().from(settings)).find((r) => r.key === "mail_gmail_password");
    expect(raw?.value).not.toContain("abcdefgh"); // not stored as plain text
    await saveMailAccount(db, "other@gmail.com", ""); // empty password: the saved one stays
    expect(await mailConfig(db)).toMatchObject({ user: "other@gmail.com", pass: "abcdefghijklmnop" });
  });
});
