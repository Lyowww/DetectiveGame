import "server-only";
import type { CaseDefinition } from "@/server/cases/types";
import { normalizeCase } from "@/server/cases/helpers";
import { tideLedger } from "@/server/cases/tide-ledger";
import { glassAuction } from "@/server/cases/glass-auction";
import { ledgerCut } from "@/server/cases/ledger-cut";
import { nightSignal } from "@/server/cases/night-signal";
import { sealedEnvelope } from "@/server/cases/sealed-envelope";
import { wetAsphalt } from "@/server/cases/wet-asphalt";
import { falseLogin } from "@/server/cases/false-login";
import { lastFerry } from "@/server/cases/last-ferry";

const CASES: CaseDefinition[] = [
  tideLedger,
  glassAuction,
  ledgerCut,
  nightSignal,
  sealedEnvelope,
  wetAsphalt,
  falseLogin,
  lastFerry,
].map(normalizeCase);

const byId = new Map(CASES.map((item) => [item.id, item]));

export function allCases(): CaseDefinition[] {
  return CASES;
}

export function playableCases(): CaseDefinition[] {
  return CASES.filter((item) => item.status === "playable");
}

export function getCase(caseId: string): CaseDefinition {
  const found = byId.get(caseId);
  if (!found) throw new Error(`Unknown case: ${caseId}`);
  return found;
}

export function getCaseOrNull(caseId: string): CaseDefinition | null {
  return byId.get(caseId) ?? null;
}

export function knownCaseIds(): Set<string> {
  return new Set(playableCases().map((item) => item.id));
}

export function defaultCaseId(): string {
  return tideLedger.id;
}

export function caseOf(state: { caseId: string }): CaseDefinition {
  return getCase(state.caseId);
}
