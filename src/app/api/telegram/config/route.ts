import { NextResponse } from "next/server";
import { devMockEnabled, publicBot } from "@/server/telegram/bot";

export const runtime = "nodejs";

export async function GET() {
  const bot = publicBot();
  return NextResponse.json({
    configured: bot.configured,
    username: bot.username,
    appUrl: bot.appUrl,
    devMock: devMockEnabled(),
  });
}
