import "server-only";
import type { PublicRun } from "@/lib/public-run";
import type { Lang, RunState } from "@/lib/types";
import { formatClock, formatDate } from "@/lib/time";
import { SECRET_CANARY } from "@/server/cases/secret";
import { caseOf, playableCases } from "@/server/cases/catalog";
import { evidenceSummary } from "@/server/cases/helpers";

export type { PublicRun };

function whenOf(lang: Lang, minute: number | null, date?: string, tod?: string, uncertain?: boolean): string {
  const parts = [date, minute != null ? `${formatDate(minute)} ${formatClock(minute)}` : null, tod, uncertain ? (lang === "hy" ? "մոտավոր" : "uncertain") : null];
  return parts.filter(Boolean).join(" · ");
}

export function toPublic(
  state: RunState,
  extras: { guest: boolean; aiConfigured: boolean; speechConfigured: boolean; ttsConfigured: boolean },
): PublicRun {
  const lang = state.language;
  const def = caseOf(state);
  const discovered = new Set(state.discovered);
  const completion =
    def.completion?.type === "rescue"
      ? { type: "rescue" as const, locationId: def.completion.locationId, label: def.completion.actionLabel[lang] }
      : { type: "report" as const, locationId: null, label: null };
  const payload: PublicRun = {
    id: state.id,
    caseId: state.caseId,
    caseVersion: state.caseVersion,
    title: def.title[lang],
    coverImage: def.coverImage ?? `/covers/${def.id}.jpg`,
    language: lang,
    difficulty: state.difficulty,
    mode: state.mode,
    status: state.status,
    minute: state.minute,
    clock: formatClock(state.minute),
    date: formatDate(state.minute),
    deadline: state.difficulty === "hard" ? formatClock(def.deadlineMinute) : null,
    locationId: state.locationId,
    completion,
    locations: def.locations
      .filter((place) => place.visitable)
      .map((place) => ({
        id: place.id,
        name: place.name[lang],
        blurb: place.blurb[lang],
        characters: place.characters.filter((id) => {
          const person = def.characters.find((item) => item.id === id);
          return person && (!person.requiresRescue || state.rescued);
        }),
        regions: place.regions.map((region) => ({ id: region.id, label: region.label[lang], summary: region.summary[lang] })),
        records: place.records.map((record) => ({
          id: record.id,
          label: record.label[lang],
          detail: record.detail[lang],
          obtained: def.evidence.some(
            (item) => item.discover.type === "record" && item.discover.recordId === record.id && discovered.has(item.id),
          ),
        })),
      })),
    characters: def.characters
      .filter((person) => !person.requiresRescue || state.rescued)
      .map((person) => {
        const disclosed = new Set(state.disclosures[person.id] ?? []);
        const interviewed = state.messages.some((message) => message.role === "character" && message.characterId === person.id);
        const followUpAvailable = def.topics.some((topic) => {
          if (topic.characterId !== person.id) return false;
          if (!topic.requiresEvidence?.length) return false;
          if (topic.requiresEvidence.some((id) => !discovered.has(id))) return false;
          if (topic.requiresDisclosure?.some((id) => !disclosed.has(id))) return false;
          if (topic.blockedByDisclosure?.some((id) => disclosed.has(id))) return false;
          if (disclosed.has(topic.id)) return false;
          if (topic.setsDisclosure?.some((id) => disclosed.has(id))) return false;
          return true;
        });
        const suggestions = (person.suggestions ?? []).map((item) => item[lang]);
        return {
          id: person.id,
          name: person.name[lang],
          role: person.role[lang],
          presence: person.presence[lang],
          relationship: (person.relationship ?? person.presence)[lang],
          portrait: person.portrait ?? `/portraits/${person.id}.jpg`,
          locationId: person.requiresRescue ? (def.completion?.type === "rescue" ? def.completion.locationId : person.locationId) : person.locationId,
          voice: person.voice,
          available: !person.requiresRescue || state.rescued,
          interviewed,
          followUpAvailable: interviewed && followUpAvailable,
          suggestions,
          suggestionChips: suggestions,
        };
      }),
    evidence: def.evidence
      .filter((item) => discovered.has(item.id))
      .map((item) => ({
        id: item.id,
        type: item.type,
        kind: item.kind,
        title: item.title[lang],
        source: item.source[lang],
        acquired: item.acquired[lang],
        summary: evidenceSummary(item, lang),
        highlights: (item.highlights ?? []).map((line) => line[lang]),
        when: whenOf(lang, item.minute, item.date, undefined, item.uncertain),
        locationId: item.locationId,
        people: item.people,
        body: item.body[lang],
        regions: item.regions?.map((region) => ({ id: region.id, label: region.label[lang], detail: region.detail[lang] })),
        claims: item.claims?.map((claim) => ({
          id: claim.id,
          speakerId: claim.speakerId,
          text: claim.text[lang],
          when: whenOf(lang, claim.minute, claim.date, claim.tod, claim.uncertain),
          locationId: claim.locationId,
          kind: claim.kind,
        })),
        amounts: item.amounts?.map((amount) => ({ ...amount, label: amount.label[lang] })),
        identity: item.identity
          ? {
              label: item.identity.label[lang],
              hair: item.identity.hair?.[lang],
              clothing: item.identity.clothing?.[lang],
              watch: item.identity.watch?.[lang],
            }
          : undefined,
        frames: item.frames?.map((frame) => ({
          id: frame.id,
          time: frame.time,
          camera: frame.camera[lang],
          caption: frame.caption[lang],
        })),
      })),
    messages: state.messages.map((message) => ({
      id: message.id,
      characterId: message.characterId,
      role: message.role,
      text: message.text,
      atMinute: message.atMinute,
      clock: formatClock(message.atMinute),
      evidenceIds: message.evidenceIds,
      source: message.source,
    })),
    notes: state.notes,
    assertions: state.assertions,
    boardNodes: state.boardNodes,
    boardEdges: state.boardEdges,
    contradictions: state.contradictions,
    playerEvents: state.playerEvents,
    timeline: [
      ...def.evidence
        .filter((item) => discovered.has(item.id))
        .flatMap((item) =>
          (item.claims ?? []).map((claim) => ({
            id: claim.id,
            title: claim.text[lang],
            when: whenOf(lang, claim.minute, claim.date, claim.tod, claim.uncertain),
            minute: claim.minute,
            endMinute: claim.endMinute ?? null,
            uncertain: Boolean(claim.uncertain || claim.date),
            locationId: claim.locationId ?? null,
            personId: claim.speakerId === "system" ? null : claim.speakerId,
            kind: claim.kind,
            sourceId: item.id,
          })),
        ),
      ...state.playerEvents.map((event) => ({
        id: event.id,
        title: event.title,
        when: event.minute == null ? (lang === "hy" ? "առանց ժամի" : "no time") : formatClock(event.minute),
        minute: event.minute,
        endMinute: event.endMinute,
        uncertain: event.uncertain,
        locationId: event.locationId,
        personId: event.personId,
        kind: "player" as const,
        sourceId: event.id,
      })),
    ],
    hints: state.hints.map((hint) => ({ level: hint.level, text: hint.text })),
    hintLadder: def.hints.map((hint) => ({
      level: hint.level,
      cost: hint.cost,
      taken: state.hints.some((item) => item.level === hint.level),
      available: hint.level === 1 || state.hints.some((item) => item.level === hint.level - 1),
    })),
    rescued: state.rescued,
    rescuedLate: state.rescuedLate,
    reviewUnlocked: state.reviewUnlocked,
    reconstruction: state.reviewUnlocked ? def.reconstruction[lang] : null,
    evaluation: state.evaluation,
    score: state.score,
    report: state.report,
    objectives: { main: def.objectives.main[lang], optional: def.objectives.optional[lang] },
    firstLead:
      def.firstLead?.[lang] ??
      (() => {
        const start = def.startLocationId ?? def.locations.find((place) => place.visitable)?.id;
        const first = def.characters.find((person) => person.locationId === start && !person.requiresRescue);
        return first
          ? lang === "hy"
            ? `Խոսեք ${first.name.hy}-ի հետ։`
            : `Speak to ${first.name.en}.`
          : def.objectives.main[lang];
      })(),
    progress: {
      evidenceFound: state.discovered.length,
      interviewsDone: new Set(state.messages.filter((message) => message.role === "character").map((message) => message.characterId)).size,
      notesCount: state.notes.length,
    },
    travel: Object.entries(def.travel).map(([key, minutes]) => {
      const [a, b] = key.split("|");
      return { a, b, minutes };
    }),
    attempt: state.attempt,
    ...extras,
  };
  const encoded = JSON.stringify(payload);
  if (encoded.includes(SECRET_CANARY)) {
    throw new Error("Refusing to send a payload that contains authoring material.");
  }
  return payload;
}

export function publicCaseList(lang: Lang) {
  return playableCases().map((item) => ({
    id: item.id,
    version: item.version,
    title: item.title[lang],
    genre: item.genre[lang],
    duration: item.duration[lang],
    durationMinutes: item.durationMinutes ?? { min: 20, max: 35 },
    teaser: item.teaser[lang],
    briefing: item.briefing[lang],
    firstLead:
      item.firstLead?.[lang] ??
      item.objectives.main[lang],
    objective: item.objectives.main[lang],
    coverImage: item.coverImage ?? `/covers/${item.id}.jpg`,
    status: item.status ?? "playable",
    difficulties: ["easy", "normal", "hard"] as const,
  }));
}
