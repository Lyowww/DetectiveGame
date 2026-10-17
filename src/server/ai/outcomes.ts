import "server-only";

const outcomes = new Map<string, { at: number; outcome: string }>();

export function noteOutcome(modelId: string, outcome: string) {
  outcomes.set(modelId, { at: Date.now(), outcome: outcome.slice(0, 160) });
}

export function readOutcomes() {
  return outcomes;
}

export function __resetOutcomesForTests() {
  outcomes.clear();
}
