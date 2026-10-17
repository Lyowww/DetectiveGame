import { NextResponse } from "next/server";
import { z } from "zod";
import { attributeReferral, destinationFor, establishTelegramUser, redeemLinkCode } from "@/server/telegram/identity";
import { issueSession } from "@/server/telegram/session-cookie";
import { allow } from "@/server/telegram/limit";
import { devMockEnabled } from "@/server/telegram/bot";
import { parseLaunch } from "@/server/telegram/launch";
import { verifyInitData } from "@/server/telegram/verify";

export const runtime = "nodejs";

const bodySchema = z.object({
  initData: z.string().max(4096).optional(),
  linkCode: z.string().max(32).optional(),
  dev: z.boolean().optional(),
  telegramUserId: z.string().regex(/^\d{1,20}$/).optional(),
});

function cookie(response: NextResponse, issued: { name: string; value: string; maxAge: number }) {
  // Telegram Mini Apps run in a third-party WebView — Lax cookies often never stick.
  const secure = issued.name.startsWith("__Secure-") || process.env.NODE_ENV === "production";
  response.cookies.set(issued.name, issued.value, {
    httpOnly: true,
    sameSite: secure ? "none" : "lax",
    secure,
    path: "/",
    maxAge: issued.maxAge,
  });
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allow(`tg-auth:${ip}`, 20, 60_000)) return NextResponse.json({ error: "Too many sign-in attempts." }, { status: 429 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Sign-in data was not accepted." }, { status: 400 });

  if (parsed.data.dev) {
    if (!devMockEnabled() || !parsed.data.telegramUserId) return NextResponse.json({ error: "Development sign-in is not available." }, { status: 403 });
    const userId = await establishTelegramUser(parsed.data.telegramUserId);
    const issued = await issueSession(userId);
    const route = await destinationFor(userId, null);
    const response = NextResponse.json({ ...route, devMock: true });
    cookie(response, issued);
    return response;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({
      error: "Telegram sign-in is not configured. Set TELEGRAM_BOT_TOKEN (and TELEGRAM_WEBHOOK_SECRET) in Vercel environment variables, then redeploy.",
      code: "telegram_not_configured",
    }, { status: 503 });
  }
  if (!parsed.data.initData) {
    return NextResponse.json({
      error: "Open CASEFILE from the Telegram bot or menu button so Telegram can pass a signed session.",
      code: "missing_init_data",
    }, { status: 400 });
  }
  const verified = verifyInitData(parsed.data.initData, token);
  if (!verified.ok) {
    return NextResponse.json({
      error: "Telegram sign-in was rejected. Check that TELEGRAM_BOT_TOKEN matches the bot that opened this Mini App.",
      code: "invalid_init_data",
    }, { status: 401 });
  }

  const launch = parseLaunch(verified.data.startParam);
  const linkCode = parsed.data.linkCode || (launch.kind === "link" ? launch.code : "");
  let userId: string;
  if (linkCode) {
    const linked = await redeemLinkCode(linkCode, verified.data.telegramUserId);
    if (!linked.ok) return NextResponse.json({ error: "That Telegram account is already linked, or the code expired." }, { status: 409 });
    userId = linked.userId;
  } else {
    userId = await establishTelegramUser(verified.data.telegramUserId);
    await attributeReferral(userId, launch);
  }
  const issued = await issueSession(userId);
  const route = await destinationFor(userId, linkCode ? null : verified.data.startParam);
  const response = NextResponse.json({ ...route, devMock: false });
  cookie(response, issued);
  return response;
}
