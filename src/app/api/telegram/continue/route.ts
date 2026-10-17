import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/server/session";
import { createOneTimeCode, redeemContinueCode } from "@/server/telegram/identity";
import { allow } from "@/server/telegram/limit";
import { issueSession } from "@/server/telegram/session-cookie";

export const runtime = "nodejs";

export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const code = await createOneTimeCode("continue", user.id);
  return NextResponse.json({
    code,
    expiresIn: 600,
    hint: "Open this site in a browser and enter the code. The code is not a link.",
  });
}

const redeemSchema = z.object({ code: z.string().regex(/^[a-f0-9]{10}$/) });

export async function PUT(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allow(`tg-continue:${ip}`, 10, 60_000)) return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  const parsed = redeemSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "That code is not valid." }, { status: 400 });
  const userId = await redeemContinueCode(parsed.data.code);
  if (!userId) return NextResponse.json({ error: "That code expired or was already used." }, { status: 400 });
  const issued = await issueSession(userId);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(issued.name, issued.value, {
    httpOnly: true,
    sameSite: "lax",
    secure: issued.name.startsWith("__Secure-"),
    path: "/",
    maxAge: issued.maxAge,
  });
  return response;
}
