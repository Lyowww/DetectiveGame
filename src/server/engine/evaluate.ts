import "server-only";
import type { Evaluation, FinalReport, Grade, RunState, ScoreBreakdown } from "@/lib/types";
import { caseOf } from "@/server/cases/catalog";

function mentions(text: string, words: string[]): boolean {
  const hay = text.toLowerCase();
  return words.some((word) => hay.includes(word.toLowerCase()));
}

function resolveWhere(state: RunState, report: FinalReport): boolean {
  const def = caseOf(state);
  if (report.whereId === def.whereId) return true;
  return mentions(report.explanation, def.evaluation?.whereWords ?? [def.whereId]);
}

function resolvePerson(state: RunState, report: FinalReport): { id: string; wrong: boolean; accused: boolean } {
  const def = caseOf(state);
  const text = `${report.explanation} ${report.motive}`;
  let id = report.responsibleId;
  if (id === "unknown" || id === "none" || id === "") {
    for (const [personId, words] of Object.entries(def.evaluation?.personWords ?? {})) {
      if (mentions(text, words)) {
        id = personId;
        break;
      }
    }
  }
  const wrong = (def.evaluation?.wrongAccusations ?? []).includes(id);
  const accused = id === def.culpritId || wrong;
  return { id, wrong, accused };
}

function covers(state: RunState, cardId: string, evidenceId: string): boolean {
  if (cardId === evidenceId) return true;
  const item = caseOf(state).evidence.find((evidence) => evidence.id === evidenceId);
  return Boolean(item?.claims?.some((claim) => claim.id === cardId));
}

export function contradictionHandled(state: RunState): boolean {
  const def = caseOf(state);
  const [a, b] = def.contradictionPair;
  return state.contradictions.some((card) => {
    if (card.state === "unverified") return false;
    const left = covers(state, card.claimAId, a) || covers(state, card.claimBId, a);
    const right = covers(state, card.claimAId, b) || covers(state, card.claimBId, b);
    return left && right;
  });
}

export function evaluateReport(state: RunState, report: FinalReport): Evaluation {
  const def = caseOf(state);
  const whereCorrect = resolveWhere(state, report);
  const person = resolvePerson(state, report);
  const personCorrect = person.id === def.culpritId;
  const citedStrong = report.evidenceIds.filter(
    (id) => def.strongEvidence.includes(id) && state.discovered.includes(id),
  );
  const optionalResolved = def.optionalEvidence.every(
    (id) => report.evidenceIds.includes(id) && state.discovered.includes(id),
  );
  const handled = contradictionHandled(state);
  const wrongAccusation = person.wrong;
  const needsRescue = def.completion?.type === "rescue";
  const rescuedOk = !needsRescue || state.rescued;
  const unsupportedAccusation = person.id === def.culpritId && citedStrong.length === 0 && !state.rescued;

  let grade: Grade;
  if (rescuedOk && whereCorrect && personCorrect && citedStrong.length >= 2) grade = "strong";
  else if (rescuedOk && whereCorrect && !wrongAccusation) grade = "weak";
  else if (rescuedOk) grade = "partial";
  else if (whereCorrect && personCorrect && citedStrong.length >= 2) grade = "partial";
  else if (unsupportedAccusation || (person.id === def.culpritId && citedStrong.length === 0)) grade = "unsupported";
  else grade = "incorrect";

  const summaries: Record<Grade, Evaluation["summary"]> = {
    strong: {
      en: "You closed the objective and backed it with records you chose.",
      hy: "Փակեցիք նպատակը և հենեցիք ձեր ընտրած գրառումներով։",
    },
    weak: {
      en: "The main finding holds, but the support is thin.",
      hy: "Հիմնական գտածոն կանգուն է, բայց հենարանը բարակ է։",
    },
    partial: {
      en: "The file and the written conclusion do not fully meet.",
      hy: "Գործը և գրավոր եզրակացությունը լիովին չեն համընկնում։",
    },
    unsupported: {
      en: "The person you named is not backed by the records you selected.",
      hy: "Ձեր նշած անձը չի հենվում ձեր ընտրած գրառումների վրա։",
    },
    incorrect: {
      en: "The conclusion does not match the case.",
      hy: "Եզրակացությունը չի համապատասխանում գործին։",
    },
  };

  return {
    grade,
    rescued: state.rescued,
    rescuedLate: state.rescuedLate,
    whereCorrect,
    personCorrect,
    wrongAccusation,
    unsupportedAccusation: grade === "unsupported",
    optionalResolved,
    contradictionHandled: handled,
    citedStrong,
    summary: summaries[grade],
  };
}

export function scoreEvaluation(state: RunState, evaluation: Evaluation): ScoreBreakdown {
  const def = caseOf(state);
  const items: ScoreBreakdown["items"] = [];
  const needsRescue = def.completion?.type === "rescue";
  const closed =
    needsRescue
      ? evaluation.rescued
      : evaluation.grade === "strong" || evaluation.grade === "weak" || evaluation.grade === "partial";
  if (closed) {
    items.push({
      code: needsRescue ? "rescue" : "close",
      points: needsRescue ? 400 : 300,
      label: needsRescue
        ? { en: "The missing person was found", hy: "Անհետ կորածը գտնվել է" }
        : { en: "The objective was closed", hy: "Նպատակը փակվել է" },
    });
    if (needsRescue && state.difficulty === "hard") {
      items.push(
        evaluation.rescuedLate
          ? { code: "late", points: 40, label: { en: "Found after the deadline", hy: "Գտնվել է ժամկետից հետո" } }
          : { code: "on-time", points: 100, label: { en: "Found before the deadline", hy: "Գտնվել է ժամկետից առաջ" } },
      );
    }
  }
  for (const id of evaluation.citedStrong) {
    const title = def.evidence.find((item) => item.id === id)?.title;
    items.push({
      code: `evidence:${id}`,
      points: 40,
      label: title ?? { en: id, hy: id },
    });
  }
  if (evaluation.contradictionHandled) {
    items.push({
      code: "contradiction",
      points: 80,
      label: { en: "You kept the contradiction on the table", hy: "Հակասությունը պահեցիք սեղանին" },
    });
  }
  if (evaluation.optionalResolved) {
    items.push({
      code: "optional",
      points: 120,
      label: { en: "Optional trail documented", hy: "Լրացուցիչ հետքը փաստված է" },
    });
  }
  for (const hint of state.hints) {
    const cost = hint.level === 1 ? 30 : hint.level === 2 ? 60 : 100;
    items.push({
      code: `hint-${hint.level}`,
      points: -cost,
      label: { en: `Hint ${hint.level}`, hy: `Հուշում ${hint.level}` },
    });
  }
  if (evaluation.wrongAccusation) {
    items.push({
      code: "wrong-accusation",
      points: -150,
      label: { en: "Unsupported accusation of the wrong person", hy: "Սխալ անձի չհիմնավորված մեղադրանք" },
    });
  } else if (evaluation.unsupportedAccusation) {
    items.push({
      code: "unsupported",
      points: -50,
      label: { en: "Accusation without the supporting records", hy: "Մեղադրանք առանց հենող գրառումների" },
    });
  }
  const total = Math.max(0, items.reduce((sum, item) => sum + item.points, 0));
  return { total, items };
}
