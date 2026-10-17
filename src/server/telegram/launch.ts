import { knownCaseIds, defaultCaseId } from "@/server/cases/catalog";

export type Launch =
  | { kind: "home" }
  | { kind: "case"; caseId: string }
  | { kind: "daily" }
  | { kind: "referral"; code: string }
  | { kind: "link"; code: string }
  | { kind: "unavailable" };

const PARAM = /^[A-Za-z0-9_-]{0,64}$/;
const KNOWN_CASES = knownCaseIds();

/** start_param is attribution and routing only. It never names a run or a secret. */
export function parseLaunch(startParam: string | null | undefined): Launch {
  if (!startParam) return { kind: "home" };
  if (!PARAM.test(startParam)) return { kind: "unavailable" };
  if (startParam === "home") return { kind: "home" };
  if (startParam === "daily") return { kind: "daily" };
  if (startParam === "case") return { kind: "case", caseId: defaultCaseId() };
  if (startParam.startsWith("case_")) {
    const caseId = startParam.slice(5);
    return KNOWN_CASES.has(caseId) ? { kind: "case", caseId } : { kind: "unavailable" };
  }
  if (startParam.startsWith("ref_")) {
    const code = startParam.slice(4);
    return /^[A-Za-z0-9]{6,16}$/.test(code) ? { kind: "referral", code } : { kind: "unavailable" };
  }
  if (startParam.startsWith("link_")) {
    const code = startParam.slice(5);
    return /^[A-Za-z0-9]{8,32}$/.test(code) ? { kind: "link", code } : { kind: "unavailable" };
  }
  return { kind: "unavailable" };
}

export function routeFor(launch: Launch, activeRunId: string | null): { path: string; notice: string | null } {
  if (launch.kind === "case") return { path: `/briefing/${launch.caseId}`, notice: null };
  if (launch.kind === "daily") return { path: `/briefing/${defaultCaseId()}?challenge=daily`, notice: null };
  if (launch.kind === "unavailable") return { path: "/library", notice: "That opening is not in the archive." };
  if (activeRunId) return { path: `/investigate/${activeRunId}`, notice: null };
  return { path: "/", notice: null };
}
