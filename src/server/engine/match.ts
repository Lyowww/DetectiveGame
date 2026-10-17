import "server-only";
import type { Lang, RunState } from "@/lib/types";
import { SECRET_CANARY } from "@/server/cases/secret";
import { caseOf } from "@/server/cases/catalog";
import { textOf, type Topic } from "@/server/cases/types";

function aliases(state: RunState): Record<string, string[]> {
  const def = caseOf(state);
  return Object.fromEntries(def.characters.map((person) => [person.id, person.aliases ?? [person.id]]));
}

export function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s:]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function has(text: string, term: string): boolean {
  return normalize(text).includes(normalize(term));
}

export function namedCharacter(state: RunState, text: string, except?: string): string | null {
  const n = normalize(text);
  for (const [id, names] of Object.entries(aliases(state))) {
    if (id === except) continue;
    if (names.some((alias) => n.includes(normalize(alias)))) return id;
  }
  return null;
}

function disclosures(state: RunState, characterId: string): string[] {
  return state.disclosures[characterId] ?? [];
}

function topicOpen(topic: Topic, state: RunState): boolean {
  if (topic.requiresEvidence?.some((id) => !state.discovered.includes(id))) return false;
  if (topic.requiresDisclosure?.some((id) => !disclosures(state, topic.characterId).includes(id))) return false;
  if (topic.blockedByDisclosure?.some((id) => disclosures(state, topic.characterId).includes(id))) return false;
  return true;
}

function decisiveCount(state: RunState, characterId: string, evidenceIds: string[]): number {
  const decisive = caseOf(state).decisiveEvidence ?? [];
  const all = new Set([...(state.presented[characterId] ?? []), ...evidenceIds]);
  return [...all].filter((id) => decisive.includes(id) && state.discovered.includes(id)).length;
}

function scoreTopic(topic: Topic, text: string, lang: Lang, evidenceIds: string[], state: RunState): number {
  if (topic.id.endsWith("-confront") && decisiveCount(state, topic.characterId, evidenceIds) < 2) {
    // Still allow if the topic's own evidence list is fully presented.
    if (!(topic.evidence ?? []).every((id) => evidenceIds.includes(id) || (state.presented[topic.characterId] ?? []).includes(id))) {
      if (!(topic.evidence ?? []).some((id) => evidenceIds.includes(id))) return 0;
    }
  }
  let score = 0;
  if ((topic.phrases[lang] ?? []).some((phrase) => has(text, phrase))) score += 5;
  const groups = topic.groups?.[lang] ?? [];
  if (groups.length > 0 && groups.every((group) => group.some((term) => has(text, term)))) score += 4;
  if (topic.evidence?.some((id) => evidenceIds.includes(id))) score += 6;
  return score;
}

export function selectTopic(
  state: RunState,
  characterId: string,
  text: string,
  evidenceIds: string[],
): Topic | null {
  let specific: { topic: Topic; score: number } | null = null;
  let generic: { topic: Topic; score: number } | null = null;
  for (const topic of caseOf(state).topics) {
    if (topic.characterId !== characterId || !topicOpen(topic, state)) continue;
    const score = scoreTopic(topic, text, state.language, evidenceIds, state);
    const bucket = topic.id.endsWith("-greet") ? "generic" : "specific";
    if (bucket === "generic") {
      if (!generic || score > generic.score) generic = { topic, score };
    } else if (!specific || score > specific.score) specific = { topic, score };
  }
  if (specific && specific.score >= 4) return specific.topic;
  if (generic && generic.score >= 4) return generic.topic;
  return null;
}

function corpusSupports(state: RunState, speakerId: string, text: string): boolean {
  const names = aliases(state)[speakerId] ?? [];
  const words = normalize(text)
    .split(" ")
    .filter((word) => word.length > 4 && !names.some((alias) => normalize(alias) === word));
  const blob = [
    ...state.messages.filter((message) => message.characterId === speakerId).map((message) => message.text),
    ...caseOf(state).evidence
      .filter(
        (item) =>
          state.discovered.includes(item.id) &&
          (item.people.includes(speakerId) || item.claims?.some((claim) => claim.speakerId === speakerId)),
      )
      .map((item) => item.body[state.language]),
  ]
    .map(normalize)
    .join(" ");
  return words.filter((word) => blob.includes(word)).length >= 2;
}

export function detectBluff(
  state: RunState,
  characterId: string,
  text: string,
  evidenceIds: string[],
): string | null {
  if (evidenceIds.length > 0) return null;
  const pattern =
    state.language === "hy"
      ? /ասաց|ասել է|պնդում է|ըստ /
      : /\b(said|told|claims|claimed|according to|named you)\b/i;
  if (!pattern.test(text)) return null;
  const alleged = namedCharacter(state, text, characterId);
  if (!alleged) return null;
  if (corpusSupports(state, alleged, text)) return null;
  return alleged;
}

export interface DialoguePreview {
  characterId: string;
  canonical: string;
  topicId: string | null;
  lie: boolean;
  reveals: string[];
  disclosure: string | null;
  bluffSpeakerId: string | null;
}

export function previewDialogue(
  state: RunState,
  characterId: string,
  text: string,
  evidenceIds: string[],
): DialoguePreview {
  const character = caseOf(state).characters.find((item) => item.id === characterId)!;
  const shutdownKey = `${characterId}-shutdown`;
  if (disclosures(state, characterId).includes(shutdownKey) || disclosures(state, characterId).includes("marcus-shutdown")) {
    return {
      characterId,
      canonical: character.shutdown?.[state.language] ?? character.unknown[state.language],
      topicId: shutdownKey,
      lie: false,
      reveals: [],
      disclosure: null,
      bluffSpeakerId: null,
    };
  }
  const bluff = detectBluff(state, characterId, text, evidenceIds);
  if (bluff) {
    return {
      characterId,
      canonical: character.bluff[state.language],
      topicId: null,
      lie: false,
      reveals: [],
      disclosure: null,
      bluffSpeakerId: bluff,
    };
  }
  const topic = selectTopic(state, characterId, text, evidenceIds);
  if (!topic) {
    return {
      characterId,
      canonical: character.unknown[state.language],
      topicId: null,
      lie: false,
      reveals: [],
      disclosure: null,
      bluffSpeakerId: null,
    };
  }
  return {
    characterId,
    canonical: textOf(topic.response, state.difficulty, state.language),
    topicId: topic.id,
    lie: topic.lie,
    reveals: topic.reveals ?? [],
    disclosure: topic.setsDisclosure?.[0] ?? topic.id,
    bluffSpeakerId: null,
  };
}

export function numbersIn(value: string): string[] {
  return value.match(/\d[\d:.]*/g) ?? [];
}

export function dialogueIsSafe(spoken: string, canonical: string): boolean {
  if (!spoken.trim() || spoken.length > 800) return false;
  if (spoken.includes(SECRET_CANARY)) return false;
  const allowed = new Set(numbersIn(canonical));
  return numbersIn(spoken).every((value) => allowed.has(value));
}
