import { NextResponse } from "next/server";
import { readRun } from "@/server/game";
import { currentUser } from "@/server/session";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ runId: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { runId } = await context.params;
  const run = await readRun(user.id, runId, user.guest);
  if (!run) return NextResponse.json({ error: "That file is not yours." }, { status: 404 });
  return NextResponse.json({ run });
}
