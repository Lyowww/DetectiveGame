import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/server/session";
import { createOneTimeCode, linkEmail } from "@/server/telegram/identity";
import { issueSession } from "@/server/telegram/session-cookie";

export const runtime = "nodejs";

export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const code = await createOneTimeCode("link", user.id);
  return NextResponse.json({ code, expiresIn: 600 });
}

const emailSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  name: z.string().max(80).optional(),
});

export async function PUT(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const parsed = emailSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Those details are not valid." }, { status: 400 });
  const linked = await linkEmail(user.id, parsed.data.email, parsed.data.password, parsed.data.name ?? user.name);
  if (!linked.ok) {
    const status = linked.reason === "conflict" ? 409 : 400;
    return NextResponse.json({ error: status === 409 ? "That Telegram account is already linked to someone else." : "The email or password was not accepted." }, { status });
  }
  const issued = await issueSession(linked.userId);
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
