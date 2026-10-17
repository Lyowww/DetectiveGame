import { NextResponse } from "next/server";
import { z } from "zod";
import { createInvestigation, listRuns } from "@/server/game";
import { currentUser } from "@/server/session";

export const runtime = "nodejs";

const createSchema = z.object({
  caseId: z.string().min(1).max(64),
  language: z.enum(["en", "hy"]),
  difficulty: z.enum(["easy", "normal", "hard"]),
  mode: z.enum(["demo", "live"]),
});

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  return NextResponse.json({ runs: await listRuns(user.id), guest: user.guest });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (user.guest) return NextResponse.json({ error: "Create an account or sign in before opening a case." }, { status: 403 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a case, language, and difficulty." }, { status: 400 });
  try {
    const run = await createInvestigation({ userId: user.id, guest: user.guest, ...parsed.data });
    return NextResponse.json({ run });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not open the file." }, { status: 400 });
  }
}
