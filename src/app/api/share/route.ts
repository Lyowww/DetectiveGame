import { NextResponse } from "next/server";
import { defaultCaseId, getCase, getCaseOrNull } from "@/server/cases/catalog";
import { publicBot } from "@/server/telegram/bot";
import { readRun } from "@/server/game";
import { currentUser } from "@/server/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const runId = url.searchParams.get("runId");
  const caseId = url.searchParams.get("caseId") ?? defaultCaseId();
  const def = getCaseOrNull(caseId) ?? getCase(defaultCaseId());
  const bot = publicBot();
  const open = bot.username
    ? `https://t.me/${bot.username}${bot.shortName ? `/${bot.shortName}` : ""}?startapp=case_${def.id}`
    : `/briefing/${def.id}`;
  const card: { title: string; difficulty: string | null; score: number | null; grade: string | null; url: string } = {
    title: def.title.en,
    difficulty: null,
    score: null,
    grade: null,
    url: open,
  };
  if (!runId) return NextResponse.json(card);
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const run = await readRun(user.id, runId, user.guest);
  if (!run) return NextResponse.json({ error: "That file is not yours." }, { status: 404 });
  card.difficulty = run.difficulty;
  card.title = run.title;
  card.url = bot.username
    ? `https://t.me/${bot.username}${bot.shortName ? `/${bot.shortName}` : ""}?startapp=case_${run.caseId}`
    : `/briefing/${run.caseId}`;
  if (run.status === "completed" && run.score) {
    card.score = run.score.total;
    card.grade = run.evaluation?.grade ?? null;
  }
  return NextResponse.json(card);
}
