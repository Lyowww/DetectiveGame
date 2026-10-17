import "server-only";
import { clockOn } from "@/lib/time";
import type { CaseDefinition, Evidence, Topic } from "@/server/cases/types";
import { L, normalizeCase } from "@/server/cases/helpers";

type Cast = {
  id: string;
  name: [string, string];
  role: [string, string];
  presence: [string, string];
  relationship: [string, string];
  portrait: string;
  locationId: string;
  voice: string;
  aliases: string[];
  speechStyle: string;
  requiresRescue?: boolean;
  suggestions?: [string, string][];
};

type Place = {
  id: string;
  name: [string, string];
  blurb: [string, string];
  characters: string[];
  regions: { id: string; label: [string, string]; summary: [string, string] }[];
  records?: { id: string; label: [string, string]; detail: [string, string] }[];
};

export type CompactCaseInput = {
  id: string;
  version?: string;
  title: [string, string];
  genre: [string, string];
  duration: [string, string];
  durationMinutes: { min: number; max: number };
  teaser: [string, string];
  briefing: [string, string];
  coverImage: string;
  main: [string, string];
  optional: [string, string];
  start: { day: 16 | 17; time: string };
  deadline: { day: 16 | 17; time: string };
  startLocationId: string;
  places: Place[];
  cast: Cast[];
  evidence: Evidence[];
  topics: Topic[];
  travel: Record<string, number>;
  hints: { level: 1 | 2 | 3; cost: number; text: [string, string] }[];
  strongEvidence: string[];
  optionalEvidence: string[];
  decisiveEvidence: string[];
  culpritId: string;
  whereId: string;
  contradictionPair: [string, string];
  criticalClues: { id: string; paths: string[][] }[];
  reconstruction: [string, string];
  completion: CaseDefinition["completion"];
  evaluation: NonNullable<CaseDefinition["evaluation"]>;
};

export function buildCompactCase(input: CompactCaseInput): CaseDefinition {
  return normalizeCase({
    id: input.id,
    version: input.version ?? "1.0.0",
    title: L(...input.title),
    genre: L(...input.genre),
    duration: L(...input.duration),
    durationMinutes: input.durationMinutes,
    teaser: L(...input.teaser),
    briefing: L(...input.briefing),
    coverImage: input.coverImage,
    status: "playable",
    objectives: { main: L(...input.main), optional: L(...input.optional) },
    startMinute: clockOn(input.start.day, input.start.time),
    deadlineMinute: clockOn(input.deadline.day, input.deadline.time),
    startLocationId: input.startLocationId,
    decisiveEvidence: input.decisiveEvidence,
    completion: input.completion,
    evaluation: input.evaluation,
    locations: input.places.map((place) => ({
      id: place.id,
      name: L(...place.name),
      blurb: L(...place.blurb),
      visitable: true,
      characters: place.characters,
      regions: place.regions.map((region) => ({
        id: region.id,
        label: L(...region.label),
        summary: L(...region.summary),
      })),
      records: (place.records ?? []).map((record) => ({
        id: record.id,
        label: L(...record.label),
        detail: L(...record.detail),
      })),
    })),
    characters: input.cast.map((person) => ({
      id: person.id,
      name: L(...person.name),
      role: L(...person.role),
      presence: L(...person.presence),
      relationship: L(...person.relationship),
      portrait: person.portrait,
      voice: person.voice,
      locationId: person.locationId,
      requiresRescue: person.requiresRescue,
      aliases: person.aliases,
      speechStyle: person.speechStyle,
      unknown: L("I do not know that.", "Ես դա չգիտեմ։"),
      bluff: L("I never said that to you.", "Ես ձեզ այդպես չեմ ասել։"),
      suggestions: person.suggestions?.map((pair) => L(...pair)),
    })),
    evidence: input.evidence,
    topics: input.topics,
    travel: input.travel,
    hints: input.hints.map((hint) => ({ level: hint.level, cost: hint.cost, text: L(...hint.text) })),
    strongEvidence: input.strongEvidence,
    optionalEvidence: input.optionalEvidence,
    culpritId: input.culpritId,
    whereId: input.whereId,
    contradictionPair: input.contradictionPair,
    criticalClues: input.criticalClues,
    reconstruction: L(...input.reconstruction),
  });
}

export function E(
  partial: Omit<Evidence, "kind"> & { kind?: Evidence["kind"] },
): Evidence {
  return {
    kind: "record",
    ...partial,
    people: partial.people ?? [],
    summary: partial.summary ?? { en: partial.title.en, hy: partial.title.hy },
  };
}

export function T(partial: Topic): Topic {
  return partial;
}
