export type Lang = "en" | "hy";
export type Difficulty = "easy" | "normal" | "hard";
export type PlayMode = "demo" | "live";

export interface L10n {
  en: string;
  hy: string;
}

export interface Note {
  id: string;
  body: string;
  quote: string | null;
  sourceType: "message" | "evidence" | "free";
  sourceId: string | null;
  speaker: string | null;
  inWorldMinute: number | null;
  tags: string[];
  personId: string | null;
  locationId: string | null;
  importance: "low" | "normal" | "high";
  /** The player's own classification. Never a system verdict. */
  mark: "unverified" | "suspicious" | "corroborated" | "resolved";
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Assertion {
  id: string;
  text: string;
  toCharacterId: string;
  allegedSpeakerId: string | null;
  atMinute: number;
  /** Always false. A bluff is never promoted to verified evidence. */
  verified: false;
}

export interface BoardNode {
  id: string;
  kind: "person" | "place" | "evidence" | "note";
  refId: string;
  x: number;
  y: number;
  label: string;
}

export interface BoardEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  state: "confirmed" | "suspected" | "disproven";
}

export interface Contradiction {
  id: string;
  claimAId: string;
  claimBId: string;
  explanation: string;
  state: "unverified" | "suspected" | "established";
  createdAt: string;
}

export interface PlayerEvent {
  id: string;
  title: string;
  minute: number | null;
  endMinute: number | null;
  uncertain: boolean;
  locationId: string | null;
  personId: string | null;
  sourceNote: string;
}

export interface RunMessage {
  id: string;
  characterId: string;
  role: "player" | "character" | "system";
  text: string;
  atMinute: number;
  evidenceIds: string[];
  source: "demo" | "live" | "system";
  /** Server-only. Stripped from API responses. */
  topicId?: string;
  lie?: boolean;
}

export interface HintUse {
  level: 1 | 2 | 3;
  atMinute: number;
  text: string;
}

export interface ScoreItem {
  code: string;
  points: number;
  label: L10n;
}

export interface ScoreBreakdown {
  total: number;
  items: ScoreItem[];
}

export type Grade = "strong" | "weak" | "partial" | "unsupported" | "incorrect";

export interface Evaluation {
  grade: Grade;
  rescued: boolean;
  rescuedLate: boolean;
  whereCorrect: boolean;
  personCorrect: boolean;
  wrongAccusation: boolean;
  unsupportedAccusation: boolean;
  optionalResolved: boolean;
  contradictionHandled: boolean;
  citedStrong: string[];
  summary: L10n;
}

export interface FinalReport {
  whereId: string;
  responsibleId: string;
  explanation: string;
  motive: string;
  uncertainties: string;
  evidenceIds: string[];
}

export interface RunState {
  version: 1;
  id: string;
  userId: string;
  caseId: string;
  caseVersion: string;
  language: Lang;
  difficulty: Difficulty;
  mode: PlayMode;
  status: "active" | "completed";
  minute: number;
  locationId: string;
  discovered: string[];
  inspected: string[];
  messages: RunMessage[];
  disclosures: Record<string, string[]>;
  presented: Record<string, string[]>;
  assertions: Assertion[];
  notes: Note[];
  boardNodes: BoardNode[];
  boardEdges: BoardEdge[];
  contradictions: Contradiction[];
  playerEvents: PlayerEvent[];
  hints: HintUse[];
  rescued: boolean;
  rescuedLate: boolean;
  reviewUnlocked: boolean;
  evaluation: Evaluation | null;
  score: ScoreBreakdown | null;
  report: FinalReport | null;
  attempt: number;
  recentActionAt: number[];
  aiTokens: number;
  createdAt: string;
  updatedAt: string;
}
