import { NextResponse } from "next/server";
import { getCase } from "@/server/cases/catalog";
import { leaderboard } from "@/server/game";
import type { Difficulty } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const difficulty = (["easy", "normal", "hard"].includes(url.searchParams.get("difficulty") ?? "")
    ? url.searchParams.get("difficulty")
    : "normal") as Difficulty;
  const period = url.searchParams.get("period") === "day" || url.searchParams.get("period") === "week" ? url.searchParams.get("period")! : "all";
  const firstOnly = url.searchParams.get("first") !== "0";
  const caseId = url.searchParams.get("caseId") || "tide-ledger";
  const def = getCase(caseId);
  const rows = await leaderboard({ caseId, difficulty, period: period as "all" | "week" | "day", firstOnly });
  return NextResponse.json({
    caseId: def.id,
    caseVersion: def.version,
    difficulty,
    period,
    firstOnly,
    rows,
  });
}
