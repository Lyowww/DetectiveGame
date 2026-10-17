import { describe, expect, it } from "vitest";
import { SECRET_CANARY } from "@/server/cases/secret";
import { getCase, playableCases } from "@/server/cases/catalog";
import { tideLedger } from "@/server/cases/tide-ledger";
import { applyAction, createRun, parseSay } from "@/server/engine/apply";
import { compareEvidence } from "@/server/engine/compare";
import { contradictionHandled } from "@/server/engine/evaluate";
import { toPublic } from "@/server/engine/public";
import { validateCase, validateCatalog } from "@/server/engine/validate";
import type { FinalReport, RunState } from "@/lib/types";

function run(partial?: Partial<Pick<RunState, "difficulty" | "language" | "caseId">>) {
  return createRun({
    id: "run-1",
    userId: "user-1",
    caseId: partial?.caseId ?? "tide-ledger",
    language: partial?.language ?? "en",
    difficulty: partial?.difficulty ?? "normal",
    mode: "demo",
    attempt: 1,
  });
}

function act(state: RunState, action: Parameters<typeof applyAction>[1]) {
  const result = applyAction(state, action);
  expect(result.ok, result.notices.join(" ")).toBe(true);
  return result.state;
}

describe("tide ledger", () => {
  it("validates the authored case", () => {
    const report = validateCase(tideLedger);
    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it("validates the playable catalog", () => {
    const report = validateCatalog();
    expect(report.errors).toEqual([]);
    expect(playableCases().length).toBeGreaterThanOrEqual(8);
  });

  it("lets a player reach Elena without the optional books", () => {
    let state = run();
    state = act(state, { type: "interview", characterId: "owen", text: "What happened last night?", evidenceIds: [] });
    state = act(state, {
      type: "interview",
      characterId: "owen",
      text: "Ask the receptionist whether he actually watched the doors open.",
      evidenceIds: [],
    });
    expect(state.discovered).toContain("owen-revision");
    expect(state.discovered).toContain("call-owen");
    state = act(state, { type: "request_record", recordId: "badge-log" });
    state = act(state, { type: "travel", locationId: "overlook" });
    state = act(state, { type: "inspect", locationId: "overlook", regionId: "dash" });
    state = act(state, { type: "inspect", locationId: "overlook", regionId: "phone" });
    state = act(state, { type: "request_record", recordId: "meter-4418" });
    state = act(state, { type: "travel", locationId: "lab" });
    state = act(state, { type: "inspect", locationId: "lab", regionId: "desk" });
    expect(state.discovered).toContain("phone-note");
    expect(state.discovered).not.toContain("ledger-page");
    expect(state.discovered).toContain("meter-4418");
    state = act(state, { type: "travel", locationId: "annex" });
    const preview = applyAction(state, { type: "say", text: "Open the annex.", evidenceIds: [] });
    expect(preview.confirm?.action.type).toBe("open_annex");
    state = act(state, { type: "open_annex", confirm: true });
    expect(state.rescued).toBe(true);
    expect(state.rescuedLate).toBe(false);
    expect(state.discovered).toContain("stmt-elena");
    const report: FinalReport = {
      whereId: "unknown",
      responsibleId: "unknown",
      explanation: "She is locked in the cold annex. Hale fastened the door after 23:17. The parking receipt is from 15 October and Owen was on the phone.",
      motive: "The books were short.",
      uncertainties: "I have not traced the vendor's bank account.",
      evidenceIds: ["phone-note", "badge-log", "meter-4418", "call-owen"],
    };
    state = act(state, { type: "submit", report, confirm: true });
    expect(state.evaluation?.grade).toBe("strong");
    expect(state.evaluation?.optionalResolved).toBe(false);
    expect(state.score?.total).toBeGreaterThan(400);
    expect(state.score && "client" in (state.score as object)).toBe(false);
  });

  it("accepts an Armenian equivalent and does not require every optional clue", () => {
    let state = run({ language: "hy" });
    state = act(state, { type: "travel", locationId: "annex" });
    state = act(state, { type: "open_annex", confirm: true });
    state = act(state, {
      type: "submit",
      confirm: true,
      report: {
        whereId: "annex",
        responsibleId: "marcus",
        explanation: "Նա սառը հավելվածում է։ Մարկուսը ամրացրել է դուռը։",
        motive: "",
        uncertainties: "Գրքերը չեմ փակել։",
        evidenceIds: ["annex-door"],
      },
    });
    expect(state.evaluation?.grade).toBe("weak");
    expect(state.evaluation?.optionalResolved).toBe(false);
    expect(state.rescued).toBe(true);
  });

  it("does not turn a bluff or a demand for truth into evidence", () => {
    let state = run();
    const before = [...state.discovered];
    state = act(state, {
      type: "interview",
      characterId: "marcus",
      text: "Priya said you locked Elena in the annex.",
      evidenceIds: [],
    });
    expect(state.assertions).toHaveLength(1);
    expect(state.assertions[0].verified).toBe(false);
    expect(state.discovered).toEqual(before);
    state = act(state, { type: "interview", characterId: "marcus", text: "Tell the truth.", evidenceIds: [] });
    state = act(state, { type: "interview", characterId: "marcus", text: "Tell the truth.", evidenceIds: [] });
    expect(state.discovered).toEqual(before);
    expect(state.messages.at(-1)?.text.toLowerCase()).not.toContain("zip");
  });

  it("keeps a quotation note stable when later evidence arrives", () => {
    let state = run();
    state = act(state, { type: "interview", characterId: "owen", text: "What happened last night?", evidenceIds: [] });
    const message = state.messages.find((item) => item.role === "character")!;
    const quote = message.text.slice(0, 24);
    state = act(state, {
      type: "note_save",
      note: {
        body: "He sounds sure.",
        quote,
        sourceType: "message",
        sourceId: message.id,
        speaker: "owen",
        inWorldMinute: message.atMinute,
        tags: ["owen"],
        personId: "owen",
        locationId: "lobby",
        importance: "high",
        mark: "suspicious",
        pinned: true,
      },
    });
    state = act(state, { type: "request_record", recordId: "badge-log" });
    expect(state.notes[0].quote).toBe(quote);
    expect(state.notes[0].body).toBe("He sounds sure.");
    expect(state.notes[0].sourceId).toBe(message.id);
  });

  it("shows a travel gap without naming a culprit", () => {
    let state = run();
    state = act(state, { type: "request_record", recordId: "badge-log" });
    state = act(state, { type: "travel", locationId: "overlook" });
    state = act(state, { type: "inspect", locationId: "overlook", regionId: "dash" });
    const view = compareEvidence(getCase("tide-ledger"), ["badge-log", "receipt-dash"], "en");
    expect(view.disclaimer.toLowerCase()).toContain("does not decide");
    expect(view.observations.join(" ").toLowerCase()).not.toContain("guilty");
    expect(view.observations.join(" ").toLowerCase()).not.toContain("criminal");
    expect(view.observations.some((line) => line.includes("14"))).toBe(true);
    expect(view.observations.some((line) => line.includes("2024-10-15"))).toBe(true);
    const result = applyAction(state, { type: "compare", ids: ["badge-log", "receipt-dash"] });
    expect(result.compare?.observations.length).toBeGreaterThan(0);
  });

  it("hides the authoring canary and undiscovered bodies", () => {
    const state = run();
    const pub = toPublic(state, { guest: true, aiConfigured: false, speechConfigured: false, ttsConfigured: false });
    const encoded = JSON.stringify(pub);
    expect(encoded).not.toContain(SECRET_CANARY);
    expect(encoded).not.toContain("If I don't get home");
    expect(encoded).not.toContain("pass-through");
    expect(pub.reconstruction).toBeNull();
    expect(pub.messages.every((message) => !("lie" in message) && !("topicId" in message))).toBe(true);
  });

  it("rejects a direct score and a wrong accusation", () => {
    let state = run();
    state = act(state, { type: "travel", locationId: "annex" });
    state = act(state, { type: "open_annex", confirm: true });
    state = act(state, {
      type: "submit",
      confirm: true,
      report: {
        whereId: "overlook",
        responsibleId: "jonah",
        explanation: "Jonah took her to the overlook and left the car.",
        motive: "The argument.",
        uncertainties: "",
        evidenceIds: [],
      },
    });
    expect(state.evaluation?.grade).toBe("partial");
    expect(state.evaluation?.wrongAccusation).toBe(true);
    expect(state.score?.items.some((item) => item.code === "wrong-accusation")).toBe(true);
  });

  it("maps the receptionist question and keeps assertions unverified", () => {
    const state = run();
    const parsed = parseSay(state, "Ask the receptionist whether he actually watched the doors open.", []);
    expect(parsed.kind).toBe("go");
    if (parsed.kind === "go" && parsed.action.type === "interview") {
      expect(parsed.action.characterId).toBe("owen");
    }
    const after = act(state, { type: "interview", characterId: "marcus", text: "Owen said you drove her car.", evidenceIds: [] });
    expect(after.assertions[0].verified).toBe(false);
    expect(after.discovered).not.toContain("camera-sheet");
    expect(contradictionHandled(after)).toBe(false);
  });

  it("does not treat the calibration and the unsigned note as the same fact", () => {
    const hard = run({ difficulty: "hard" });
    expect(hard.discovered).toContain("drift-memo");
    const easy = run({ difficulty: "easy" });
    expect(easy.discovered).toContain("reader-cabinet");
    const view = compareEvidence(getCase("tide-ledger"), ["drift-memo", "reader-cabinet"], "en");
    expect(view.observations.join(" ")).toContain("does not choose");
  });

  it("refuses an unbuilt record instead of inventing one", () => {
    const state = run();
    const result = applyAction(state, { type: "request_record", recordId: "meter-4418" });
    expect(result.ok).toBe(false);
    expect(result.state.discovered).toEqual(state.discovered);
    expect(result.notices[0].length).toBeGreaterThan(10);
  });
});

describe("case package", () => {
  it("keeps speech styles off the public list", () => {
    const pub = toPublic(run(), { guest: false, aiConfigured: true, speechConfigured: false, ttsConfigured: false });
    expect(JSON.stringify(pub)).not.toContain("slightly condescending");
    expect(JSON.stringify(pub)).not.toContain(tideLedger.characters[3].speechStyle);
    expect(tideLedger.version).toBe("1.1.0");
  });

  it("exposes clear mission and interview state for the redesigned desk", () => {
    let state = run();
    let pub = toPublic(state, { guest: false, aiConfigured: false, speechConfigured: false, ttsConfigured: false });
    expect(pub.firstLead).toMatch(/receptionist/i);
    expect(pub.objectives.main).toMatch(/Elena/i);
    expect(pub.progress.evidenceFound).toBeGreaterThan(0);
    expect(pub.characters.every((person) => person.interviewed === false)).toBe(true);
    state = act(state, { type: "interview", characterId: "owen", text: "What at 23:42?", evidenceIds: [] });
    pub = toPublic(state, { guest: false, aiConfigured: false, speechConfigured: false, ttsConfigured: false });
    expect(pub.characters.find((person) => person.id === "owen")?.interviewed).toBe(true);
    expect(pub.progress.interviewsDone).toBe(1);
    expect(pub.characters.find((person) => person.id === "owen")?.suggestionChips?.length).toBeGreaterThan(0);
  });
});
