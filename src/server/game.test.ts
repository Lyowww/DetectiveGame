import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { SECRET_CANARY } from "@/server/cases/secret";
import { db, ensureDb } from "@/server/db";
import { user } from "@/server/db/schema";
import { act, createInvestigation, ensureProfile, readRun } from "@/server/game";

async function makeUser(id: string) {
  const now = new Date();
  await db.insert(user).values({
    id,
    name: id,
    email: `${id}@casefile.test`,
    emailVerified: false,
    createdAt: now,
    updatedAt: now,
    isAnonymous: true,
  });
  await ensureProfile(id, id);
  await db.update(user).set({ isAnonymous: false }).where(eq(user.id, id));
}

describe("persistence", () => {
  beforeAll(async () => {
    process.env.CASEFILE_DB = "memory";
    await ensureDb();
    await makeUser("detective-a");
    await makeUser("detective-b");
  });

  it("keeps notes, blocks other players, and does not double-apply", async () => {
    const created = await createInvestigation({
      userId: "detective-a",
      guest: false,
      caseId: "tide-ledger",
      language: "en",
      difficulty: "normal",
      mode: "demo",
    });
    expect(JSON.stringify(created)).not.toContain(SECRET_CANARY);
    const first = await act({
      userId: "detective-a",
      runId: created.id,
      guest: true,
      idempotencyKey: "note-1",
      action: {
        type: "note_save",
        note: {
          body: "The overlook is only a habit.",
          quote: "She goes to the overlook when the work won't let go.",
          sourceType: "evidence",
          sourceId: "stmt-jonah",
          speaker: "jonah",
          inWorldMinute: created.minute,
          tags: ["habit"],
          personId: "jonah",
          locationId: "overlook",
          importance: "normal",
          mark: "unverified",
          pinned: false,
        },
      },
    });
    expect(first?.run.notes).toHaveLength(1);
    const again = await act({
      userId: "detective-a",
      runId: created.id,
      guest: true,
      idempotencyKey: "note-1",
      action: {
        type: "note_save",
        note: {
          body: "This should not replace the first save.",
          quote: null,
          sourceType: "free",
          sourceId: null,
          speaker: null,
          inWorldMinute: null,
          tags: [],
          personId: null,
          locationId: null,
          importance: "low",
          mark: "unverified",
          pinned: false,
        },
      },
    });
    expect(again?.run.notes).toHaveLength(1);
    expect(again?.run.notes[0].quote).toContain("overlook");
    const reloaded = await readRun("detective-a", created.id, true);
    expect(reloaded?.notes[0].body).toBe("The overlook is only a habit.");
    expect(await readRun("detective-b", created.id, true)).toBeNull();
    const rows = await db.select().from(user).where(eq(user.id, "detective-b"));
    expect(rows).toHaveLength(1);
  });

  it("rejects a browser-supplied score by never reading one", async () => {
    const created = await createInvestigation({
      userId: "detective-a",
      guest: false,
      caseId: "tide-ledger",
      language: "en",
      difficulty: "easy",
      mode: "live",
    });
    expect(created.mode).toBe("demo");
    const moved = await act({
      userId: "detective-a",
      runId: created.id,
      guest: true,
      idempotencyKey: "annex",
      action: { type: "travel", locationId: "annex" },
    });
    const opened = await act({
      userId: "detective-a",
      runId: created.id,
      guest: true,
      idempotencyKey: "open",
      action: { type: "open_annex", confirm: true },
    });
    expect(moved?.ok).toBe(true);
    expect(opened?.run.rescued).toBe(true);
    const filed = await act({
      userId: "detective-a",
      runId: created.id,
      guest: true,
      idempotencyKey: "file",
      action: {
        type: "submit",
        confirm: true,
        report: {
          whereId: "annex",
          responsibleId: "unknown",
          explanation: "Elena is in the cold annex. I do not yet know who shut the door.",
          motive: "",
          uncertainties: "The books are untouched.",
          evidenceIds: [],
        },
      },
    });
    expect(filed?.run.score?.total).toBe(400);
    expect(filed?.run.evaluation?.grade).toBe("weak");
  });
});
