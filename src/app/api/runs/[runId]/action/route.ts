import { NextResponse } from "next/server";
import { z } from "zod";
import { actionSchema } from "@/lib/actions";
import { act } from "@/server/game";
import { currentUser } from "@/server/session";

export const runtime = "nodejs";

const bodySchema = z.object({
  idempotencyKey: z.string().min(8).max(80),
  action: actionSchema,
});

export async function POST(request: Request, context: { params: Promise<{ runId: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "That action is not allowed." }, { status: 400 });
  const { runId } = await context.params;
  const result = await act({
    userId: user.id,
    runId,
    guest: user.guest,
    idempotencyKey: parsed.data.idempotencyKey,
    action: parsed.data.action,
  });
  if (!result) return NextResponse.json({ error: "That file is not yours." }, { status: 404 });
  return NextResponse.json(result);
}
