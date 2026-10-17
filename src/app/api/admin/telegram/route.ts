import { NextResponse } from "next/server";
import { adminAuthorized } from "@/server/ai/admin";
import { botConfigured, configureBot, publicBot } from "@/server/telegram/bot";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!adminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const bot = publicBot();
  return NextResponse.json({
    configured: bot.configured,
    webhookReady: botConfigured(),
    username: bot.username,
    appUrl: bot.appUrl,
    shortName: bot.shortName,
    hasToken: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    hasWebhookSecret: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET),
    env: {
      TELEGRAM_BOT_TOKEN: "set TELEGRAM_BOT_TOKEN from @BotFather (server-side only)",
      TELEGRAM_WEBHOOK_SECRET: "set a long random secret shared with setWebhook",
      TELEGRAM_BOT_USERNAME: "optional public @username without @",
      TELEGRAM_APP_SHORT_NAME: "optional Mini App short name from BotFather",
      APP_URL: "https production origin used for the webhook and menu button",
    },
  });
}

export async function POST(request: Request) {
  if (!adminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { action?: string };
  if (body.action !== "setup") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
  const result = await configureBot();
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
