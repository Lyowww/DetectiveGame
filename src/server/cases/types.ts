import "server-only";
import type { Difficulty, L10n, Lang } from "@/lib/types";

export type EvidenceType =
  | "document"
  | "message"
  | "call"
  | "photo"
  | "camera"
  | "audio"
  | "access"
  | "map"
  | "object"
  | "transaction"
  | "statement";

export interface Claim {
  id: string;
  speakerId: string;
  text: L10n;
  minute: number | null;
  endMinute?: number | null;
  /** Clock time printed on a document that is not on the case-night timeline. */
  tod?: string;
  date?: string;
  uncertain?: boolean;
  locationId?: string;
  kind: "record" | "claim";
}

export interface Evidence {
  id: string;
  type: EvidenceType;
  kind: "record" | "claim";
  title: L10n;
  source: L10n;
  acquired: L10n;
  minute: number | null;
  endMinute?: number | null;
  date?: string;
  uncertain?: boolean;
  locationId?: string;
  people: string[];
  body: L10n;
  /** One-line card summary. Full body stays behind “Read full”. */
  summary?: L10n;
  highlights?: L10n[];
  regions?: { id: string; label: L10n; detail: L10n }[];
  claims?: Claim[];
  amounts?: { id: string; label: L10n; value: number; unit: string }[];
  identity?: { label: L10n; hair?: L10n; clothing?: L10n; watch?: L10n };
  frames?: { id: string; time: string; camera: L10n; caption: L10n }[];
  /** Also in the opening packet at these difficulties, besides `discover`. */
  alsoStart?: Difficulty[];
  discover:
    | { type: "start" }
    | { type: "start-easy" }
    | { type: "start-hard" }
    | { type: "inspect"; locationId: string; regionId: string }
    | { type: "record"; recordId: string; requiresEvidence?: string[] }
    | { type: "topic"; topicId: string }
    | { type: "when"; allOf: string[] }
    | { type: "rescued" };
}

export interface Topic {
  id: string;
  characterId: string;
  phrases: Record<Lang, string[]>;
  groups?: Record<Lang, string[][]>;
  evidence?: string[];
  requiresEvidence?: string[];
  requiresDisclosure?: string[];
  blockedByDisclosure?: string[];
  response: L10n | Partial<Record<Difficulty, L10n>>;
  reveals?: string[];
  setsDisclosure?: string[];
  /** Authoring flag. Never sent to the client. */
  lie: boolean;
}

export interface CaseDefinition {
  id: string;
  version: string;
  title: L10n;
  genre: L10n;
  duration: L10n;
  durationMinutes?: { min: number; max: number };
  /** Spoiler-free one-line library hook. */
  teaser: L10n;
  /** Short briefing shown before start (~60–90 words). */
  briefing: L10n;
  coverImage?: string;
  status?: "playable" | "upcoming";
  objectives: { main: L10n; optional: L10n };
  /** Spoiler-free first action shown on the mission screen. */
  firstLead?: L10n;
  startMinute: number;
  deadlineMinute: number;
  startLocationId?: string;
  /** Evidence ids that help force a confront topic when presented together. */
  decisiveEvidence?: string[];
  completion?: { type: "rescue"; locationId: string; actionLabel: L10n } | { type: "report" };
  evaluation?: {
    whereWords: string[];
    personWords: Record<string, string[]>;
    wrongAccusations: string[];
  };
  locations: {
    id: string;
    name: L10n;
    blurb: L10n;
    visitable: boolean;
    characters: string[];
    regions: { id: string; label: L10n; summary: L10n }[];
    records: { id: string; label: L10n; detail: L10n }[];
  }[];
  characters: {
    id: string;
    name: L10n;
    role: L10n;
    presence: L10n;
    relationship?: L10n;
    portrait?: string;
    voice: string;
    locationId: string;
    requiresRescue?: boolean;
    aliases?: string[];
    speechStyle: string;
    unknown: L10n;
    bluff: L10n;
    shutdown?: L10n;
    suggestions?: L10n[];
  }[];
  evidence: Evidence[];
  topics: Topic[];
  travel: Record<string, number>;
  hints: { level: 1 | 2 | 3; cost: number; text: L10n }[];
  strongEvidence: string[];
  optionalEvidence: string[];
  culpritId: string;
  whereId: string;
  contradictionPair: [string, string];
  criticalClues: { id: string; paths: string[][] }[];
  reconstruction: L10n;
}

export function textOf(
  value: L10n | Partial<Record<Difficulty, L10n>>,
  difficulty: Difficulty,
  lang: Lang,
): string {
  if (typeof (value as L10n).en === "string") return (value as L10n)[lang];
  const map = value as Partial<Record<Difficulty, L10n>>;
  const chosen = map[difficulty] ?? map.normal ?? map.easy ?? map.hard;
  if (!chosen) return "";
  return chosen[lang];
}
