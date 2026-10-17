import { NextResponse } from "next/server";
import { z } from "zod";
import { profileOf, updateProfile } from "@/server/game";
import { currentUser } from "@/server/session";
import { deleteAccount, ensureReferralCode, identityForUser, isSyntheticEmail, setNotify } from "@/server/telegram/identity";
import { sessionCookieName } from "@/server/telegram/session-cookie";

export const runtime = "nodejs";

const patchSchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
  locale: z.enum(["en", "hy"]).optional(),
  textSize: z.enum(["sm", "md", "lg"]).optional(),
  contrast: z.enum(["ink", "high"]).optional(),
  reducedMotion: z.boolean().optional(),
  autoplayVoice: z.boolean().optional(),
  leaderboard: z.enum(["private", "anonymous", "public"]).optional(),
  notify: z.boolean().optional(),
});

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const data = await profileOf(user.id);
  const telegram = await identityForUser(user.id);
  const referral = telegram ? await ensureReferralCode(user.id) : null;
  return NextResponse.json({
    user: {
      id: user.id,
      guest: user.guest,
      email: user.guest || isSyntheticEmail(user.email) ? null : user.email,
      telegram: Boolean(telegram),
      notify: Boolean(telegram?.notify),
      referral,
    },
    ...data,
  });
}

export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Those settings are not valid." }, { status: 400 });
  const { notify, ...profilePatch } = parsed.data;
  if (notify !== undefined) await setNotify(user.id, notify);
  const profile = Object.keys(profilePatch).length ? await updateProfile(user.id, profilePatch) : (await profileOf(user.id)).profile;
  return NextResponse.json({ profile });
}

export async function DELETE() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  await deleteAccount(user.id);
  const response = NextResponse.json({
    ok: true,
    removed: "The account, investigations, notes, and public ranking rows are deleted.",
  });
  response.cookies.set(sessionCookieName(), "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
