import "server-only";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import type { GameAction } from "@/lib/actions";
import type { Difficulty, Lang, PlayMode, RunState } from "@/lib/types";
import { aiConfigured, interpretUtterance, phraseInCharacter, speechConfigured, ttsConfigured, withinBudget } from "@/server/ai";
import { getCase, getCaseOrNull } from "@/server/cases/catalog";
import { ensureDb } from "@/server/db";
import * as tables from "@/server/db/schema";
import { applyAction, createRun, parseSay } from "@/server/engine/apply";
import { previewDialogue } from "@/server/engine/match";
import { publicCaseList, toPublic, type PublicRun } from "@/server/engine/public";

export interface ActionResponse {
  ok: boolean;
  run: PublicRun;
  notices: string[];
  alternatives: { label: string; action: GameAction }[];
  confirm: { body: string; action: GameAction } | null;
  compare: unknown;
  hintPreview: { level: 1 | 2 | 3; cost: number; warning: string } | null;
  aiFallback: string | null;
}

export async function ensureProfile(userId: string, name: string) {
  const database = await ensureDb();
  const existing = await database.select().from(tables.profile).where(eq(tables.profile.userId, userId));
  if (existing.length) return existing[0];
  const row = {
    userId,
    displayName: name || "Detective",
    locale: "en",
    textSize: "md",
    contrast: "ink",
    reducedMotion: false,
    autoplayVoice: false,
    leaderboard: "private",
    aiTokens: 0,
    aiDay: new Date().toISOString().slice(0, 10),
  };
  await database.insert(tables.profile).values(row);
  return row;
}

function extras(guest: boolean) {
  return { guest, aiConfigured: aiConfigured(), speechConfigured: speechConfigured(), ttsConfigured: ttsConfigured() };
}

export async function listCases(lang: Lang) {
  return publicCaseList(lang);
}

export async function listRuns(userId: string) {
  const database = await ensureDb();
  const rows = await database.select().from(tables.run).where(eq(tables.run.userId, userId)).orderBy(desc(tables.run.updatedAt));
  return rows.map((row) => {
    const def = getCaseOrNull(row.caseId);
    const lang = row.language as Lang;
    return {
      id: row.id,
      caseId: row.caseId,
      caseVersion: row.caseVersion,
      difficulty: row.difficulty,
      language: row.language,
      status: row.status,
      updatedAt: row.updatedAt,
      title: def?.title[lang] ?? def?.title.en ?? row.caseId,
    };
  });
}

export async function createInvestigation(input: {
  userId: string;
  guest: boolean;
  caseId: string;
  language: Lang;
  difficulty: Difficulty;
  mode: PlayMode;
}) {
  if (input.guest) throw new Error("Sign in required.");
  const def = getCase(input.caseId);
  if (def.status === "upcoming") throw new Error("That case is not open yet.");
  const database = await ensureDb();
  const prior = await database
    .select()
    .from(tables.run)
    .where(and(eq(tables.run.userId, input.userId), eq(tables.run.caseId, def.id)));
  const mode = input.mode === "live" && aiConfigured() ? "live" : "demo";
  const state = createRun({
    id: crypto.randomUUID(),
    userId: input.userId,
    caseId: def.id,
    language: input.language,
    difficulty: input.difficulty,
    mode,
    attempt: prior.length + 1,
  });
  const now = new Date();
  await database.insert(tables.run).values({
    id: state.id,
    userId: input.userId,
    caseId: state.caseId,
    caseVersion: state.caseVersion,
    difficulty: state.difficulty,
    language: state.language,
    mode: state.mode,
    status: state.status,
    snapshot: state,
    attempt: state.attempt,
    createdAt: now,
    updatedAt: now,
  });
  await project(state);
  return toPublic(state, extras(input.guest));
}

export async function readRun(userId: string, runId: string, guest: boolean) {
  const state = await loadOwned(userId, runId);
  if (!state) return null;
  return toPublic(state, extras(guest));
}

async function loadOwned(userId: string, runId: string) {
  const database = await ensureDb();
  const rows = await database.select().from(tables.run).where(and(eq(tables.run.id, runId), eq(tables.run.userId, userId)));
  return rows[0]?.snapshot ?? null;
}

function limited(state: RunState, action: GameAction) {
  const counted = action.type === "interview" || action.type === "request_record" || action.type === "say";
  if (!counted) return false;
  const now = Date.now();
  state.recentActionAt = state.recentActionAt.filter((stamp) => now - stamp < 60_000);
  return state.recentActionAt.length >= 30;
}

export async function act(input: {
  userId: string;
  runId: string;
  guest: boolean;
  idempotencyKey: string;
  action: GameAction;
}): Promise<ActionResponse | null> {
  const database = await ensureDb();
  const existing = await database
    .select()
    .from(tables.actionReceipt)
    .where(and(eq(tables.actionReceipt.runId, input.runId), eq(tables.actionReceipt.key, input.idempotencyKey)));
  if (existing[0]) return existing[0].response as ActionResponse;

  const row = await database
    .select()
    .from(tables.run)
    .where(and(eq(tables.run.id, input.runId), eq(tables.run.userId, input.userId)));
  if (!row[0]) return null;
  const state = row[0].snapshot;
  if (limited(state, input.action)) {
    return {
      ok: false,
      run: toPublic(state, extras(input.guest)),
      notices: [state.language === "hy" ? "Շատ արագ եք գործում։ Մի րոպե սպասեք։" : "Too many actions in a minute. Wait a moment."],
      alternatives: [],
      confirm: null,
      compare: null,
      hintPreview: null,
      aiFallback: null,
    };
  }

  const prepared = await prepare(state, input.action);
  const result = applyAction(state, prepared.action, { dialogue: prepared.dialogue });
  if (prepared.tokens) result.state.aiTokens += prepared.tokens;
  if (result.ok && ["interview", "request_record", "say", "travel", "inspect", "open_annex", "submit", "hint_take"].includes(input.action.type)) {
    result.state.recentActionAt.push(Date.now());
  }
  if (result.ok || result.confirm || result.hintPreview || result.compare) {
    if (result.ok && result.state !== state) await persist(result.state);
  }
  const response: ActionResponse = {
    ok: result.ok,
    run: toPublic(result.state, extras(input.guest)),
    notices: [...result.notices, ...(prepared.fallback ? [prepared.fallback] : [])],
    alternatives: result.alternatives,
    confirm: result.confirm,
    compare: result.compare,
    hintPreview: result.hintPreview,
    aiFallback: prepared.fallback,
  };
  if (result.ok) {
    await database.insert(tables.actionReceipt).values({
      id: crypto.randomUUID(),
      runId: input.runId,
      key: input.idempotencyKey,
      response,
      createdAt: new Date(),
    });
    if (result.state.status === "completed" && state.status !== "completed") await recordScore(result.state);
  }
  return response;
}

async function prepare(state: RunState, action: GameAction): Promise<{ action: GameAction; dialogue?: string; tokens: number; fallback: string | null }> {
  let next = action;
  let tokens = 0;
  let fallback: string | null = null;
  if (action.type === "say" && state.mode === "live") {
    const parsed = parseSay(state, action.text, action.evidenceIds ?? []);
    if (parsed.kind === "refuse" && aiConfigured() && withinBudget(state.aiTokens)) {
      const present = getCase(state.caseId).characters.filter((person) => person.locationId === state.locationId && (!person.requiresRescue || state.rescued)).map((person) => person.id);
      const interpreted = await interpretUtterance({
        caseId: state.caseId,
        text: action.text,
        language: state.language,
        locationId: state.locationId,
        discovered: state.discovered,
        presentCharacterIds: present,
        userId: state.userId,
      });
      if (interpreted) {
        next = interpreted.action;
        tokens += interpreted.tokens;
      } else fallback = state.language === "hy" ? "Կենդանի մեկնաբանությունը չստացվեց։ Մնում է հեղինակային շարժիչը։" : "Live interpretation failed. The authored engine answered.";
    }
  }
  const interview =
    next.type === "interview"
      ? next
      : next.type === "say"
        ? (() => {
            const parsed = parseSay(state, next.text, next.evidenceIds ?? []);
            return parsed.kind === "go" && parsed.action.type === "interview" ? parsed.action : null;
          })()
        : null;
  if (interview && state.mode === "live" && aiConfigured()) {
    if (!withinBudget(state.aiTokens)) {
      fallback = state.language === "hy" ? "Այս գործի արհեստական բանականության սահմանը լրացել է։ Պատասխանը հեղինակային է։" : "This run has reached its AI budget. The reply is the authored line.";
    } else {
      const preview = previewDialogue(state, interview.characterId, interview.text, interview.evidenceIds);
      const phrased = await phraseInCharacter({
        caseId: state.caseId,
        characterId: interview.characterId,
        canonical: preview.canonical,
        playerText: interview.text,
        language: state.language,
        userId: state.userId,
      });
      if (!phrased) {
        fallback =
          state.language === "hy"
            ? "Կենդանի AI-ն հասանելի չէ։ Պատասխանը հեղինակային է, առաջընթացը պահված է։"
            : "Live AI is unavailable. The authored reply was used; your progress is saved.";
      }
      else {
        tokens += phrased.tokens;
        if (next.type === "interview") return { action: next, dialogue: phrased.text, tokens, fallback };
        return { action: interview, dialogue: phrased.text, tokens, fallback };
      }
    }
  }
  return { action: next, tokens, fallback };
}

async function persist(state: RunState) {
  const database = await ensureDb();
  await database
    .update(tables.run)
    .set({
      snapshot: state,
      status: state.status,
      mode: state.mode,
      updatedAt: new Date(),
      completedAt: state.status === "completed" ? new Date() : null,
    })
    .where(eq(tables.run.id, state.id));
  await project(state);
}

async function project(state: RunState) {
  const database = await ensureDb();
  const now = new Date();
  await database.transaction(async (tx) => {
    await tx.delete(tables.discoveredEvidence).where(eq(tables.discoveredEvidence.runId, state.id));
    await tx.delete(tables.interviewMessage).where(eq(tables.interviewMessage.runId, state.id));
    await tx.delete(tables.note).where(eq(tables.note.runId, state.id));
    await tx.delete(tables.boardNode).where(eq(tables.boardNode.runId, state.id));
    await tx.delete(tables.boardEdge).where(eq(tables.boardEdge.runId, state.id));
    await tx.delete(tables.contradiction).where(eq(tables.contradiction.runId, state.id));
    await tx.delete(tables.timelineEvent).where(eq(tables.timelineEvent.runId, state.id));
    await tx.delete(tables.hintUse).where(eq(tables.hintUse.runId, state.id));
    await tx.delete(tables.playerAssertion).where(eq(tables.playerAssertion.runId, state.id));
    if (state.discovered.length) {
      await tx.insert(tables.discoveredEvidence).values(
        state.discovered.map((evidenceId) => ({ id: `${state.id}:${evidenceId}`, runId: state.id, evidenceId, discoveredAt: now })),
      );
    }
    if (state.messages.length) {
      await tx.insert(tables.interviewMessage).values(
        state.messages.map((message) => ({
          id: message.id,
          runId: state.id,
          characterId: message.characterId,
          role: message.role,
          body: message.text,
          evidenceIds: message.evidenceIds,
          inWorldMinute: message.atMinute,
        })),
      );
    }
    if (state.notes.length) {
      await tx.insert(tables.note).values(
        state.notes.map((item) => ({
          id: item.id,
          runId: state.id,
          userId: state.userId,
          body: item.body,
          quote: item.quote,
          sourceType: item.sourceType,
          sourceId: item.sourceId,
          speaker: item.speaker,
          mark: item.mark,
          pinned: item.pinned,
          payload: item,
          updatedAt: new Date(item.updatedAt),
        })),
      );
    }
    if (state.boardNodes.length) {
      await tx.insert(tables.boardNode).values(
        state.boardNodes.map((node) => ({ ...node, runId: state.id, x: Math.round(node.x), y: Math.round(node.y) })),
      );
    }
    if (state.boardEdges.length) {
      await tx.insert(tables.boardEdge).values(state.boardEdges.map((edge) => ({ ...edge, runId: state.id })));
    }
    if (state.contradictions.length) {
      await tx.insert(tables.contradiction).values(
        state.contradictions.map((card) => ({
          id: card.id,
          runId: state.id,
          claimAId: card.claimAId,
          claimBId: card.claimBId,
          explanation: card.explanation,
          state: card.state,
        })),
      );
    }
    if (state.playerEvents.length) {
      await tx.insert(tables.timelineEvent).values(
        state.playerEvents.map((event) => ({ id: event.id, runId: state.id, title: event.title, minute: event.minute, payload: event })),
      );
    }
    if (state.hints.length) {
      await tx.insert(tables.hintUse).values(
        state.hints.map((hint) => ({ id: `${state.id}:${hint.level}`, runId: state.id, level: hint.level, inWorldMinute: hint.atMinute })),
      );
    }
    if (state.assertions.length) {
      await tx.insert(tables.playerAssertion).values(
        state.assertions.map((item) => ({ id: item.id, runId: state.id, body: item.text, verified: false })),
      );
    }
  });
}

async function recordScore(state: RunState) {
  if (!state.score || !state.evaluation) return;
  const database = await ensureDb();
  const existing = await database.select().from(tables.submission).where(eq(tables.submission.runId, state.id));
  if (existing.length) return;
  const now = new Date();
  await database.insert(tables.submission).values({
    id: crypto.randomUUID(),
    runId: state.id,
    userId: state.userId,
    caseId: state.caseId,
    caseVersion: state.caseVersion,
    difficulty: state.difficulty,
    score: state.score.total,
    grade: state.evaluation.grade,
    firstAttempt: state.attempt === 1,
    payload: { report: state.report, evaluation: state.evaluation, score: state.score },
    createdAt: now,
  });
  if (state.score.items.length) {
    await database.insert(tables.scoreEvent).values(
      state.score.items.map((item) => ({
        id: crypto.randomUUID(),
        runId: state.id,
        userId: state.userId,
        code: item.code,
        points: item.points,
        createdAt: now,
      })),
    );
  }
  const codes = ["first-filing"];
  if (state.notes.length >= 5) codes.push("note-taker");
  if (state.evaluation.contradictionHandled) codes.push("contradiction");
  if (state.rescued && state.hints.length === 0) codes.push("rescue-no-hints");
  if (state.evaluation.optionalResolved) codes.push("optional-objective");
  if (state.difficulty === "hard" && state.rescued && (state.evaluation.grade === "strong" || state.evaluation.grade === "weak")) codes.push("hard-clear");
  for (const code of codes) {
    await database
      .insert(tables.achievement)
      .values({ userId: state.userId, code, earnedAt: now })
      .onConflictDoNothing();
  }
}

export async function updateProfile(
  userId: string,
  patch: Partial<{ displayName: string; locale: string; textSize: string; contrast: string; reducedMotion: boolean; autoplayVoice: boolean; leaderboard: string }>,
) {
  const database = await ensureDb();
  await database.update(tables.profile).set(patch).where(eq(tables.profile.userId, userId));
  const rows = await database.select().from(tables.profile).where(eq(tables.profile.userId, userId));
  return rows[0] ?? null;
}

export async function profileOf(userId: string) {
  const database = await ensureDb();
  const rows = await database.select().from(tables.profile).where(eq(tables.profile.userId, userId));
  const achievements = await database.select().from(tables.achievement).where(eq(tables.achievement.userId, userId));
  const filings = await database.select().from(tables.submission).where(eq(tables.submission.userId, userId)).orderBy(desc(tables.submission.createdAt));
  return { profile: rows[0] ?? null, achievements, filings };
}

export async function leaderboard(query: { caseId?: string; difficulty: Difficulty; period: "all" | "week" | "day"; firstOnly: boolean }) {
  const database = await ensureDb();
  const def = getCase(query.caseId ?? "tide-ledger");
  const since = query.period === "day" ? new Date(Date.now() - 86_400_000) : query.period === "week" ? new Date(Date.now() - 7 * 86_400_000) : new Date(0);
  const rows = await database
    .select({
      score: tables.submission.score,
      grade: tables.submission.grade,
      difficulty: tables.submission.difficulty,
      caseVersion: tables.submission.caseVersion,
      firstAttempt: tables.submission.firstAttempt,
      createdAt: tables.submission.createdAt,
      displayName: tables.profile.displayName,
      visibility: tables.profile.leaderboard,
    })
    .from(tables.submission)
    .innerJoin(tables.profile, eq(tables.profile.userId, tables.submission.userId))
    .where(
      and(
        eq(tables.submission.caseId, def.id),
        eq(tables.submission.caseVersion, def.version),
        eq(tables.submission.difficulty, query.difficulty),
        gte(tables.submission.createdAt, since),
        sql`${tables.profile.leaderboard} <> 'private'`,
        query.firstOnly ? eq(tables.submission.firstAttempt, true) : sql`true`,
      ),
    )
    .orderBy(desc(tables.submission.score))
    .limit(50);
  return rows.map((row) => ({
    score: row.score,
    grade: row.grade,
    caseVersion: row.caseVersion,
    difficulty: row.difficulty,
    firstAttempt: row.firstAttempt,
    createdAt: row.createdAt,
    name: row.visibility === "anonymous" ? "Anonymous" : row.displayName,
    labeledDemo: false,
  }));
}
