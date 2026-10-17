import type { RunState } from "@/lib/types";

export interface PublicRun {
  id: string;
  caseId: string;
  caseVersion: string;
  title: string;
  coverImage: string;
  language: RunState["language"];
  difficulty: RunState["difficulty"];
  mode: RunState["mode"];
  status: RunState["status"];
  minute: number;
  clock: string;
  date: string;
  deadline: string | null;
  locationId: string;
  completion: { type: "rescue" | "report"; locationId: string | null; label: string | null };
  locations: {
    id: string;
    name: string;
    blurb: string;
    characters: string[];
    regions: { id: string; label: string; summary: string }[];
    records: { id: string; label: string; detail: string; obtained: boolean }[];
  }[];
  characters: {
    id: string;
    name: string;
    role: string;
    presence: string;
    relationship: string;
    portrait: string;
    locationId: string;
    voice: string;
    available: boolean;
    interviewed: boolean;
    followUpAvailable: boolean;
    suggestions: string[];
    suggestionChips: string[];
  }[];
  evidence: {
    id: string;
    type: string;
    kind: "record" | "claim";
    title: string;
    source: string;
    acquired: string;
    summary: string;
    highlights: string[];
    when: string;
    locationId?: string;
    people: string[];
    body: string;
    unread?: boolean;
    regions?: { id: string; label: string; detail: string }[];
    claims?: { id: string; speakerId: string; text: string; when: string; locationId?: string; kind: string }[];
    amounts?: { id: string; label: string; value: number; unit: string }[];
    identity?: { label: string; hair?: string; clothing?: string; watch?: string };
    frames?: { id: string; time: string; camera: string; caption: string }[];
  }[];
  messages: {
    id: string;
    characterId: string;
    role: "player" | "character" | "system";
    text: string;
    atMinute: number;
    clock: string;
    evidenceIds: string[];
    source: "demo" | "live" | "system";
  }[];
  notes: RunState["notes"];
  assertions: RunState["assertions"];
  boardNodes: RunState["boardNodes"];
  boardEdges: RunState["boardEdges"];
  contradictions: RunState["contradictions"];
  playerEvents: RunState["playerEvents"];
  timeline: {
    id: string;
    title: string;
    when: string;
    minute: number | null;
    endMinute: number | null;
    uncertain: boolean;
    locationId: string | null;
    personId: string | null;
    kind: "record" | "claim" | "player";
    sourceId: string;
  }[];
  hints: { level: number; text: string }[];
  hintLadder: { level: 1 | 2 | 3; cost: number; taken: boolean; available: boolean }[];
  rescued: boolean;
  rescuedLate: boolean;
  reviewUnlocked: boolean;
  reconstruction: string | null;
  evaluation: RunState["evaluation"];
  score: RunState["score"];
  report: RunState["report"];
  objectives: { main: string; optional: string };
  firstLead: string;
  progress: { evidenceFound: number; interviewsDone: number; notesCount: number };
  travel: { a: string; b: string; minutes: number }[];
  attempt: number;
  guest: boolean;
  aiConfigured: boolean;
  speechConfigured: boolean;
  ttsConfigured: boolean;
}

export interface ComparePayload {
  assistance: true;
  disclaimer: string;
  items: { id: string; title: string; kind: string; source: string; body: string }[];
  times: { id: string; label: string; when: string; location: string | null }[];
  amounts: { id: string; label: string; value: string }[];
  identities: { id: string; label: string; hair: string; clothing: string; watch: string }[];
  observations: string[];
}

export interface ActionPayload {
  ok: boolean;
  run: PublicRun;
  notices: string[];
  alternatives: { label: string; action: unknown }[];
  confirm: { body: string; action: unknown } | null;
  compare: ComparePayload | null;
  hintPreview: { level: 1 | 2 | 3; cost: number; warning: string } | null;
  aiFallback: string | null;
}
