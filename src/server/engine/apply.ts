import "server-only";
import type { GameAction } from "@/lib/actions";
import type { Difficulty, Lang, PlayMode, RunState } from "@/lib/types";
import { caseOf, getCase } from "@/server/cases/catalog";
import type { Evidence } from "@/server/cases/types";
import { compareEvidence, type CompareView } from "@/server/engine/compare";
import { evaluateReport, scoreEvaluation } from "@/server/engine/evaluate";
import { dialogueIsSafe, namedCharacter, previewDialogue } from "@/server/engine/match";

export interface ApplyResult {
  ok: boolean;
  state: RunState;
  notices: string[];
  alternatives: { label: string; action: GameAction }[];
  confirm: { body: string; action: GameAction } | null;
  compare: CompareView | null;
  hintPreview: { level: 1 | 2 | 3; cost: number; warning: string } | null;
}

const COSTS = { interview: 2, record: 3, inspect: 2, open: 4 };

function clone(state: RunState): RunState {
  return structuredClone(state);
}

function fail(
  state: RunState,
  notices: string[],
  alternatives: ApplyResult["alternatives"] = [],
): ApplyResult {
  return { ok: false, state, notices, alternatives, confirm: null, compare: null, hintPreview: null };
}

function ok(state: RunState, notices: string[] = [], extra: Partial<ApplyResult> = {}): ApplyResult {
  return { ok: true, state, notices, alternatives: [], confirm: null, compare: null, hintPreview: null, ...extra };
}

function tr(lang: Lang, en: string, hy: string): string {
  return lang === "hy" ? hy : en;
}

function evidenceById(state: RunState, id: string): Evidence | undefined {
  return caseOf(state).evidence.find((item) => item.id === id);
}

function location(state: RunState, id: string) {
  return caseOf(state).locations.find((item) => item.id === id);
}

function character(state: RunState, id: string) {
  return caseOf(state).characters.find((item) => item.id === id);
}

function travelMinutes(state: RunState, a: string, b: string): number | null {
  if (a === b) return 0;
  return caseOf(state).travel[[a, b].sort().join("|")] ?? null;
}

function spend(state: RunState, minutes: number) {
  if (minutes > 0) state.minute += minutes;
}

function addMessage(
  state: RunState,
  message: Omit<RunState["messages"][number], "id" | "atMinute"> & { atMinute?: number },
) {
  state.messages.push({
    id: crypto.randomUUID(),
    atMinute: message.atMinute ?? state.minute,
    ...message,
  });
}

function grant(state: RunState, ids: string[]) {
  const fresh: string[] = [];
  for (const id of ids) {
    if (!id || state.discovered.includes(id)) continue;
    if (!evidenceById(state, id)) continue;
    state.discovered.push(id);
    fresh.push(id);
  }
  if (fresh.length) {
    const titles = fresh.map((id) => evidenceById(state, id)!.title[state.language]).join(", ");
    addMessage(state, {
      characterId: "system",
      role: "system",
      text: tr(state.language, `Added to the file: ${titles}.`, `Ավելացվեց գործին՝ ${titles}։`),
      evidenceIds: fresh,
      source: "system",
    });
  }
  unlockChains(state);
}

function unlockChains(state: RunState) {
  const def = caseOf(state);
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of def.evidence) {
      if (state.discovered.includes(item.id)) continue;
      const ready =
        (item.discover.type === "when" && item.discover.allOf.every((id) => state.discovered.includes(id))) ||
        (item.discover.type === "rescued" && state.rescued);
      if (!ready) continue;
      state.discovered.push(item.id);
      changed = true;
      addMessage(state, {
        characterId: "system",
        role: "system",
        text: tr(
          state.language,
          `Added to the file: ${item.title[state.language]}.`,
          `Ավելացվեց գործին՝ ${item.title[state.language]}։`,
        ),
        evidenceIds: [item.id],
        source: "system",
      });
    }
  }
}

function characterHere(state: RunState, characterId: string): boolean {
  const person = character(state, characterId);
  if (!person) return false;
  if (person.requiresRescue && !state.rescued) return false;
  return person.locationId === state.locationId;
}

export function createRun(input: {
  id: string;
  userId: string;
  caseId: string;
  language: Lang;
  difficulty: Difficulty;
  mode: PlayMode;
  attempt: number;
}): RunState {
  const def = getCase(input.caseId);
  const now = new Date().toISOString();
  const discovered = def.evidence
    .filter((item) => {
      if (item.discover.type === "start") return true;
      if (item.discover.type === "start-hard" && input.difficulty === "hard") return true;
      if (item.alsoStart?.includes(input.difficulty)) return true;
      return false;
    })
    .map((item) => item.id);
  return {
    version: 1,
    id: input.id,
    userId: input.userId,
    caseId: def.id,
    caseVersion: def.version,
    language: input.language,
    difficulty: input.difficulty,
    mode: input.mode,
    status: "active",
    minute: def.startMinute,
    locationId: def.startLocationId ?? "lobby",
    discovered,
    inspected: [],
    messages: [],
    disclosures: {},
    presented: {},
    assertions: [],
    notes: [],
    boardNodes: [],
    boardEdges: [],
    contradictions: [],
    playerEvents: [],
    hints: [],
    rescued: false,
    rescuedLate: false,
    reviewUnlocked: false,
    evaluation: null,
    score: null,
    report: null,
    attempt: input.attempt,
    recentActionAt: [],
    aiTokens: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function touch(state: RunState) {
  state.updatedAt = new Date().toISOString();
}

export function applyAction(
  input: RunState,
  action: GameAction,
  options?: { dialogue?: string },
): ApplyResult {
  if (action.type === "say") return applySay(input, action, options);
  const state = clone(input);
  touch(state);
  if (state.status === "completed" && action.type !== "review" && action.type !== "note_save" && action.type !== "note_delete") {
    return fail(state, [tr(state.language, "The report is filed. You can still read the file.", "Եզրակացությունը հանձնված է։ Գործը դեռ կարող եք կարդալ։")]);
  }
  switch (action.type) {
    case "travel":
      return travel(state, action.locationId);
    case "inspect":
      return inspect(state, action.locationId, action.regionId);
    case "request_record":
      return requestRecord(state, action.recordId);
    case "interview":
      return interview(state, action.characterId, action.text, action.evidenceIds, options?.dialogue);
    case "open_annex":
      return openAnnex(state);
    case "note_save":
      return saveNote(state, action.note);
    case "note_delete":
      state.notes = state.notes.filter((note) => note.id !== action.id);
      return ok(state);
    case "board_save":
      return saveBoard(state, action.nodes, action.edges);
    case "contradiction_save":
      return saveContradiction(state, action.card);
    case "contradiction_delete":
      state.contradictions = state.contradictions.filter((card) => card.id !== action.id);
      return ok(state);
    case "timeline_add":
      return saveEvent(state, action.event);
    case "timeline_delete":
      state.playerEvents = state.playerEvents.filter((event) => event.id !== action.id);
      return ok(state);
    case "hint_preview":
      return previewHint(input, action.level);
    case "hint_take":
      return takeHint(state, action.level);
    case "compare":
      return compare(input, action.ids);
    case "submit":
      return submit(state, action.report);
    case "review":
      return review(state);
    default:
      return fail(state, [tr(state.language, "That action is not available.", "Այդ գործողությունը հասանելի չէ։")]);
  }
}

function travel(state: RunState, locationId: string): ApplyResult {
  const place = location(state, locationId);
  if (!place || !place.visitable) {
    return fail(state, [tr(state.language, "That place is not somewhere you can walk into.", "Այդ տեղը մի վայր չէ, ուր կարող եք մտնել։")]);
  }
  if (place.id === state.locationId) {
    return fail(state, [tr(state.language, "You are already there.", "Դուք արդեն այնտեղ եք։")]);
  }
  const minutes = travelMinutes(state, state.locationId, place.id);
  if (minutes == null) {
    return fail(state, [tr(state.language, "There is no route on the plan.", "Հատակագծում երթուղի չկա։")]);
  }
  spend(state, minutes);
  state.locationId = place.id;
  addMessage(state, {
    characterId: "system",
    role: "system",
    text: tr(state.language, `You go to ${place.name.en}.`, `Գնում եք՝ ${place.name.hy}։`),
    evidenceIds: [],
    source: "system",
  });
  return ok(state);
}

function inspect(state: RunState, locationId: string, regionId: string): ApplyResult {
  if (locationId !== state.locationId) {
    return fail(
      state,
      [tr(state.language, "You have to be there to look.", "Նայելու համար պետք է այնտեղ լինեք։")],
      location(state, locationId)?.visitable
        ? [{ label: tr(state.language, "Go there", "Գնալ այնտեղ"), action: { type: "travel", locationId } }]
        : [],
    );
  }
  const place = location(state, locationId);
  const region = place?.regions.find((item) => item.id === regionId);
  if (!region) return fail(state, [tr(state.language, "That part of the scene is not on the list.", "Տեսարանի այդ մասը ցանկում չկա։")]);
  const key = `${locationId}:${regionId}`;
  const first = !state.inspected.includes(key);
  if (first) {
    state.inspected.push(key);
    spend(state, COSTS.inspect);
  }
  const found = caseOf(state).evidence
    .filter((item) => item.discover.type === "inspect" && item.discover.locationId === locationId && item.discover.regionId === regionId)
    .map((item) => item.id);
  grant(state, found);
  if (!found.length) {
    addMessage(state, {
      characterId: "system",
      role: "system",
      text: tr(
        state.language,
        `${region.label.en}: ${region.summary.en} Nothing new goes into the file.`,
        `${region.label.hy}՝ ${region.summary.hy} Գործի մեջ նոր բան չի մտնում։`,
      ),
      evidenceIds: [],
      source: "system",
    });
  }
  return ok(state);
}

function requestRecord(state: RunState, recordId: string): ApplyResult {
  const def = caseOf(state);
  const hosts = def.locations.filter((place) => place.records.some((record) => record.id === recordId));
  if (!hosts.length) return fail(state, [tr(state.language, "That record is not something this station can pull.", "Այդ գրառումը մի բան չէ, որ այս կայանը կարող է բերել։")]);
  if (!hosts.some((place) => place.id === state.locationId)) {
    const host = hosts[0];
    return fail(
      state,
      [tr(state.language, `Ask for that from ${host.name.en}.`, `Դա խնդրեք այստեղից՝ ${host.name.hy}։`)],
      host.visitable ? [{ label: tr(state.language, "Go there", "Գնալ այնտեղ"), action: { type: "travel", locationId: host.id } }] : [],
    );
  }
  const item = def.evidence.find((evidence) => evidence.discover.type === "record" && evidence.discover.recordId === recordId);
  if (!item || item.discover.type !== "record") return fail(state, [tr(state.language, "The terminal has no such request.", "Տերմինալն այդպիսի հարցում չունի։")]);
  const missing = (item.discover.requiresEvidence ?? []).filter((id) => !state.discovered.includes(id));
  if (missing.length) {
    return fail(state, [
      tr(
        state.language,
        "The office needs the number printed on the slip you found. You do not have that number in the file yet.",
        "Գրասենյակին պետք է ձեր գտած կտրոնի վրա տպված համարը։ Այդ համարը դեռ գործում չկա։",
      ),
    ]);
  }
  if (!state.discovered.includes(item.id)) spend(state, COSTS.record);
  grant(state, [item.id]);
  return ok(state);
}

function interview(
  state: RunState,
  characterId: string,
  text: string,
  evidenceIds: string[],
  dialogue?: string,
): ApplyResult {
  const person = character(state, characterId);
  if (!person) return fail(state, [tr(state.language, "That person is not in this case.", "Այդ մարդը այս գործում չէ։")]);
  if (person.requiresRescue && !state.rescued) {
    return fail(state, [tr(state.language, "That person is not free to answer yet.", "Այդ անձը դեռ ազատ չէ պատասխանելու։")]);
  }
  if (!characterHere(state, characterId)) {
    return fail(
      state,
      [tr(state.language, `${person.name.en} is at ${location(state, person.locationId)?.name.en ?? person.locationId}.`, `${person.name.hy} այստեղ է՝ ${location(state, person.locationId)?.name.hy ?? person.locationId}։`)],
      location(state, person.locationId)?.visitable
        ? [{ label: tr(state.language, "Go there", "Գնալ այնտեղ"), action: { type: "travel", locationId: person.locationId } }]
        : [],
    );
  }
  const known = evidenceIds.filter((id) => state.discovered.includes(id));
  const unknown = evidenceIds.filter((id) => !state.discovered.includes(id));
  if (unknown.length) {
    return fail(state, [tr(state.language, "You cannot present an item that is not in your file.", "Չեք կարող ներկայացնել մի բան, որ ձեր գործում չէ։")]);
  }
  const preview = previewDialogue(state, characterId, text, known);
  const spoken = dialogue && dialogueIsSafe(dialogue, preview.canonical) ? dialogue : preview.canonical;
  spend(state, COSTS.interview);
  addMessage(state, {
    characterId: "player",
    role: "player",
    text,
    evidenceIds: known,
    source: "demo",
  });
  if (preview.bluffSpeakerId) {
    state.assertions.push({
      id: crypto.randomUUID(),
      text,
      toCharacterId: characterId,
      allegedSpeakerId: preview.bluffSpeakerId,
      atMinute: state.minute,
      verified: false,
    });
  }
  addMessage(state, {
    characterId,
    role: "character",
    text: spoken,
    evidenceIds: known,
    source: dialogue && spoken !== preview.canonical ? "live" : "demo",
    topicId: preview.topicId ?? undefined,
    lie: preview.lie,
  });
  if (preview.disclosure) {
    const list = state.disclosures[characterId] ?? [];
    if (!list.includes(preview.disclosure)) state.disclosures[characterId] = [...list, preview.disclosure];
  }
  if (known.length) {
    const prev = state.presented[characterId] ?? [];
    state.presented[characterId] = [...new Set([...prev, ...known])];
  }
  grant(state, preview.reveals);
  return ok(state, preview.bluffSpeakerId
    ? [tr(state.language, "Recorded as your assertion. It is not verified evidence.", "Գրանցվեց որպես ձեր պնդում։ Այն հաստատված ապացույց չէ։")]
    : []);
}

function openAnnex(state: RunState): ApplyResult {
  const def = caseOf(state);
  const completion = def.completion;
  const target = completion?.type === "rescue" ? completion.locationId : def.whereId;
  if (state.locationId !== target) {
    return fail(
      state,
      [tr(state.language, "The override is not here.", "Շրջանցումը այստեղ չէ։")],
      location(state, target)?.visitable
        ? [{ label: tr(state.language, "Go there", "Գնալ այնտեղ"), action: { type: "travel", locationId: target } }]
        : [],
    );
  }
  if (state.rescued) return fail(state, [tr(state.language, "That door is already open.", "Այդ դուռն արդեն բաց է։")]);
  spend(state, COSTS.open);
  state.rescued = true;
  if (state.difficulty === "hard" && state.minute > def.deadlineMinute) state.rescuedLate = true;
  const label = completion?.type === "rescue" ? completion.actionLabel[state.language] : tr(state.language, "Override", "Շրջանցում");
  addMessage(state, {
    characterId: "system",
    role: "system",
    text: state.rescuedLate
      ? tr(state.language, `${label}. Someone is inside and can talk. You are late on the clock.`, `${label}։ Ներսում ինչ-որ մեկը կարող է խոսել։ Ժամանակի վրա ուշ եք։`)
      : tr(state.language, `${label}. Someone is inside and can talk.`, `${label}։ Ներսում ինչ-որ մեկը կարող է խոսել։`),
    evidenceIds: [],
    source: "system",
  });
  unlockChains(state);
  return ok(state);
}

function saveNote(state: RunState, note: GameAction extends never ? never : Extract<GameAction, { type: "note_save" }>["note"]): ApplyResult {
  if (note.sourceId && note.sourceType === "evidence" && !state.discovered.includes(note.sourceId)) {
    return fail(state, [tr(state.language, "That source is not in your file.", "Այդ աղբյուրը ձեր գործում չէ։")]);
  }
  if (note.sourceId && note.sourceType === "message" && !state.messages.some((message) => message.id === note.sourceId)) {
    return fail(state, [tr(state.language, "That message is not in this interview.", "Այդ հաղորդագրությունը այս հարցաքննության մեջ չէ։")]);
  }
  const now = new Date().toISOString();
  const existing = note.id ? state.notes.find((item) => item.id === note.id) : undefined;
  if (existing) {
    existing.body = note.body;
    existing.quote = note.quote;
    existing.tags = note.tags;
    existing.personId = note.personId;
    existing.locationId = note.locationId;
    existing.importance = note.importance;
    existing.mark = note.mark;
    existing.pinned = note.pinned;
    existing.updatedAt = now;
    return ok(state);
  }
  state.notes.push({
    id: note.id || crypto.randomUUID(),
    body: note.body,
    quote: note.quote,
    sourceType: note.sourceType,
    sourceId: note.sourceId,
    speaker: note.speaker,
    inWorldMinute: note.inWorldMinute,
    tags: note.tags,
    personId: note.personId,
    locationId: note.locationId,
    importance: note.importance,
    mark: note.mark,
    pinned: note.pinned,
    createdAt: now,
    updatedAt: now,
  });
  return ok(state);
}

function saveBoard(
  state: RunState,
  nodes: RunState["boardNodes"],
  edges: RunState["boardEdges"],
): ApplyResult {
  const allowed = new Set<string>();
  for (const person of caseOf(state).characters) allowed.add(`person:${person.id}`);
  for (const place of caseOf(state).locations.filter((item) => item.visitable)) allowed.add(`place:${place.id}`);
  for (const id of state.discovered) allowed.add(`evidence:${id}`);
  for (const note of state.notes) allowed.add(`note:${note.id}`);
  const cleanNodes = nodes.filter((node) => allowed.has(`${node.kind}:${node.refId}`)).slice(0, 80);
  const ids = new Set(cleanNodes.map((node) => node.id));
  const cleanEdges = edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)).slice(0, 120);
  state.boardNodes = cleanNodes;
  state.boardEdges = cleanEdges;
  return ok(state);
}

function knownClaim(state: RunState, id: string): boolean {
  if (state.discovered.includes(id) || state.messages.some((message) => message.id === id) || state.notes.some((note) => note.id === id)) {
    return true;
  }
  return caseOf(state).evidence.some(
    (item) => state.discovered.includes(item.id) && item.claims?.some((claim) => claim.id === id),
  );
}

function saveContradiction(
  state: RunState,
  card: { id?: string; claimAId: string; claimBId: string; explanation: string; state: RunState["contradictions"][number]["state"] },
): ApplyResult {
  if (!knownClaim(state, card.claimAId) || !knownClaim(state, card.claimBId)) {
    return fail(state, [tr(state.language, "Both sides of a contradiction have to be items you already have.", "Հակասության երկու կողմերն էլ պետք է լինեն բաներ, որ արդեն ունեք։")]);
  }
  const existing = card.id ? state.contradictions.find((item) => item.id === card.id) : undefined;
  if (existing) {
    existing.claimAId = card.claimAId;
    existing.claimBId = card.claimBId;
    existing.explanation = card.explanation;
    existing.state = card.state;
    return ok(state);
  }
  state.contradictions.push({
    id: card.id || crypto.randomUUID(),
    claimAId: card.claimAId,
    claimBId: card.claimBId,
    explanation: card.explanation,
    state: card.state,
    createdAt: new Date().toISOString(),
  });
  return ok(state);
}

function saveEvent(
  state: RunState,
  event: Omit<RunState["playerEvents"][number], "id"> & { id?: string },
): ApplyResult {
  const existing = event.id ? state.playerEvents.find((item) => item.id === event.id) : undefined;
  if (existing) {
    Object.assign(existing, event, { id: existing.id });
    return ok(state);
  }
  state.playerEvents.push({ ...event, id: event.id || crypto.randomUUID() });
  return ok(state);
}

function previewHint(state: RunState, level: 1 | 2 | 3): ApplyResult {
  const hint = caseOf(state).hints.find((item) => item.level === level);
  if (!hint) return fail(state, [tr(state.language, "That hint does not exist.", "Այդ հուշումը չկա։")]);
  if (state.hints.some((item) => item.level === level)) {
    return fail(state, [tr(state.language, "You already took this hint.", "Այս հուշումն արդեն վերցրել եք։")]);
  }
  if (level > 1 && !state.hints.some((item) => item.level === (level - 1) as 1 | 2)) {
    return fail(state, [tr(state.language, "Hints open in order.", "Հուշումները բացվում են հերթով։")]);
  }
  return {
    ok: true,
    state,
    notices: [],
    alternatives: [],
    confirm: null,
    compare: null,
    hintPreview: {
      level,
      cost: hint.cost,
      warning: tr(
        state.language,
        `Taking hint ${level} reduces the score by ${hint.cost}. The case can be solved without it. Confirm to reveal the hint.`,
        `${level}-րդ հուշումը վերցնելը միավորը նվազեցնում է ${hint.cost}-ով։ Գործը կարելի է լուծել առանց դրա։ Հաստատեք՝ հուշումը բացելու համար։`,
      ),
    },
  };
}

function takeHint(state: RunState, level: 1 | 2 | 3): ApplyResult {
  const preview = previewHint(state, level);
  if (!preview.hintPreview) return preview;
  const hint = caseOf(state).hints.find((item) => item.level === level)!;
  state.hints.push({ level, atMinute: state.minute, text: hint.text[state.language] });
  return ok(state, [hint.text[state.language]]);
}

function compare(state: RunState, ids: string[]): ApplyResult {
  if (ids.some((id) => !state.discovered.includes(id))) {
    return fail(state, [tr(state.language, "You can only compare items already in the file.", "Կարող եք համեմատել միայն գործում արդեն եղած բաները։")]);
  }
  return ok(state, [], { compare: compareEvidence(caseOf(state), ids, state.language) });
}

function submit(state: RunState, report: RunState["report"]): ApplyResult {
  if (!report) return fail(state, [tr(state.language, "The report is empty.", "Եզրակացությունը դատարկ է։")]);
  const evaluation = evaluateReport(state, report);
  const score = scoreEvaluation(state, evaluation);
  state.report = report;
  state.evaluation = evaluation;
  state.score = score;
  state.status = "completed";
  return ok(state, [evaluation.summary[state.language]]);
}

function review(state: RunState): ApplyResult {
  if (state.status !== "completed") {
    return fail(state, [tr(state.language, "The reconstruction opens after the report is filed.", "Վերակառուցումը բացվում է եզրակացությունը հանձնելուց հետո։")]);
  }
  state.reviewUnlocked = true;
  return ok(state);
}

function applySay(
  input: RunState,
  action: Extract<GameAction, { type: "say" }>,
  options?: { dialogue?: string },
): ApplyResult {
  const parsed = parseSay(input, action.text, action.evidenceIds ?? []);
  if (parsed.kind === "refuse") return fail(input, [parsed.notice], parsed.alternatives);
  if (parsed.kind === "confirm" && !action.confirm) {
    return { ok: false, state: input, notices: [], alternatives: [], confirm: { body: parsed.body, action: parsed.action }, compare: null, hintPreview: null };
  }
  return applyAction(input, parsed.action, options);
}

type Parsed =
  | { kind: "go"; action: GameAction }
  | { kind: "confirm"; body: string; action: GameAction }
  | { kind: "refuse"; notice: string; alternatives: ApplyResult["alternatives"] };

export function parseSay(state: RunState, text: string, evidenceIds: string[]): Parsed {
  const lang = state.language;
  const n = text.toLowerCase();
  const go = (action: GameAction): Parsed => ({ kind: "go", action });
  if (/\b(compare|versus|vs\.?)\b/i.test(text) || n.includes("համեմատ")) {
    const ids = inferCompareIds(state, text);
    if (ids.length < 2) {
      return {
        kind: "refuse",
        notice: tr(lang, "Name two items already in the file, or select them and use Compare.", "Նշեք գործում արդեն եղած երկու բան, կամ ընտրեք դրանք և սեղմեք Համեմատել։"),
        alternatives: [],
      };
    }
    return go({ type: "compare", ids });
  }
  if (/open the annex|open annex|maintenance override|բացիր հավելված|բացել հավելված|շրջանցում/i.test(text)) {
    return {
      kind: "confirm",
      body: tr(
        lang,
        "This uses the override. If someone is inside, they will be able to speak. It does not file your conclusion.",
        "Սա տեխնիկական շրջանցումով բացում է սառը հավելված Բ-ն։ Եթե Ելենան ներսում է, նա կկարողանա խոսել։ Սա ձեր եզրակացությունը չի հանձնում։",
      ),
      action: { type: "open_annex", confirm: true },
    };
  }
  if (/^\s*(hint|հուշում)\s*$/i.test(text)) {
    const next = ((state.hints.at(-1)?.level ?? 0) + 1) as 1 | 2 | 3;
    if (next > 3) return { kind: "refuse", notice: tr(lang, "There is no further hint.", "Այլ հուշում չկա։"), alternatives: [] };
    return go({ type: "hint_preview", level: next });
  }
  const place = caseOf(state).locations.find(
    (item) => item.visitable && (n.includes(item.name.en.toLowerCase()) || n.includes(item.name.hy.toLowerCase()) || n.includes(item.id)),
  );
  if (place && /\b(go|visit|travel|head)\b/i.test(text) || (place && /գնա|գնալ|տանել/i.test(text))) {
    return go({ type: "travel", locationId: place.id });
  }
  const record = caseOf(state).locations.flatMap((item) => item.records).find((item) => n.includes(item.id) || n.includes(item.label.en.toLowerCase()) || n.includes(item.label.hy.toLowerCase()));
  if (record && /request|pull|log|record|խնդր|մատյան|բեր/i.test(text)) {
    return go({ type: "request_record", recordId: record.id });
  }
  const who =
    namedCharacter(state, text) ??
    caseOf(state).characters.find((person) => characterHere(state, person.id) && evidenceIds.length > 0)?.id ??
    null;
  if (who) return go({ type: "interview", characterId: who, text, evidenceIds });
  const present = caseOf(state).characters.filter((person) => characterHere(state, person.id));
  if (present.length === 1) return go({ type: "interview", characterId: present[0].id, text, evidenceIds });
  return {
    kind: "refuse",
    notice: tr(
      lang,
      "Say who you are asking, where you are going, or which two records to compare. Nothing new was added to the file.",
      "Ասեք՝ ում եք հարցնում, ուր եք գնում, կամ որ երկու գրառումը համեմատել։ Գործին նոր բան չավելացավ։",
    ),
    alternatives: present.map((person) => ({
      label: tr(lang, `Ask ${person.name.en}`, `Հարցնել ${person.name.hy}`),
      action: { type: "interview", characterId: person.id, text, evidenceIds },
    })),
  };
}

function inferCompareIds(state: RunState, text: string): string[] {
  const n = text.toLowerCase();
  const rules: [string, string[]][] = [
    ["receipt-dash", ["receipt", "parking", "slip", "կտրոն", "կայանման"]],
    ["badge-log", ["badge", "access", "arrival", "քարտ", "մուտք"]],
    ["call-owen", ["call", "lock screen", "mobile", "զանգ", "բջջային"]],
    ["chime-log", ["chime", "ազդանշ"]],
    ["text-1840", ["text", "18:40", "message", "հաղորդագր"]],
    ["camera-sheet", ["camera", "frame", "տեսախցիկ", "կադր"]],
    ["ledger-page", ["ledger", "մատյան", "48"]],
    ["custody-sheet", ["custody", "invoice", "պահպան", "12,400", "12400"]],
    ["meter-4418", ["mr-4418", "4418"]],
    ["meter-night", ["plate search", "no session", "համարանիշ"]],
    ["stmt-owen", ["owen said", "receptionist said", "օուեն"]],
    ["phone-note", ["note", "նշում"]],
  ];
  const ids = rules.filter(([id, words]) => state.discovered.includes(id) && words.some((word) => n.includes(word))).map(([id]) => id);
  return [...new Set(ids)].slice(0, 4);
}
