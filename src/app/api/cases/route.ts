import { NextResponse } from "next/server";
import { publicCaseList } from "@/server/engine/public";
import type { Lang } from "@/lib/types";

export const runtime = "nodejs";

/** Authored catalog only — does not require the database. */
export async function GET(request: Request) {
  try {
    const lang = new URL(request.url).searchParams.get("lang") === "hy" ? "hy" : "en";
    return NextResponse.json({ cases: publicCaseList(lang as Lang) });
  } catch (error) {
    console.error("[casefile] cases list failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ cases: [], error: "Case archive temporarily unavailable." }, { status: 500 });
  }
}
