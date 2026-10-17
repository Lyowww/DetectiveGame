import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db, ensureDb } from "@/server/db";
import { user } from "@/server/db/schema";
import { establishTelegramUser, linkTelegramToUser } from "@/server/telegram/identity";

describe("telegram identity", () => {
  it("refuses to move a telegram id off an account that already has an email", async () => {
    await ensureDb();
    const telegramUser = await establishTelegramUser("9001");
    await db.update(user).set({ email: "ada@example.com" }).where(eq(user.id, telegramUser));
    const now = new Date();
    const browserUser = "browser-ada";
    await db.insert(user).values({
      id: browserUser,
      name: "Ada",
      email: "ada.browser@example.com",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
      isAnonymous: false,
    });
    const taken = await linkTelegramToUser("9001", browserUser);
    expect(taken.ok).toBe(false);
    const same = await linkTelegramToUser("9001", telegramUser);
    expect(same.ok).toBe(true);
  });
});
