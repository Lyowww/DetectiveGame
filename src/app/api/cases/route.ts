import { NextResponse } from "next/server";
import { listCases } from "@/server/game";
import type { Lang } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const lang = new URL(request.url).searchParams.get("lang") === "hy" ? "hy" : "en";
  return NextResponse.json({ cases: await listCases(lang as Lang) });
}
