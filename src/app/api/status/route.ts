import { NextResponse } from "next/server";
import { aiConfigured, speechConfigured, ttsConfigured } from "@/server/ai";
import { openRouterConfig } from "@/server/ai/config";
import { circuitStatus, usageSnapshot } from "@/server/ai/limits";
import { databaseDriver, ensureDb } from "@/server/db";

export const runtime = "nodejs";

export async function GET() {
  await ensureDb();
  const cfg = openRouterConfig();
  const usage = usageSnapshot();
  return NextResponse.json({
    database: databaseDriver(),
    ai: aiConfigured(),
    speech: speechConfigured(),
    tts: ttsConfigured(),
    mode: aiConfigured() ? "live-available" : "demo",
    openrouter: {
      configured: cfg.usingOpenRouter,
      freeOnly: cfg.freeOnly,
      primaryModel: cfg.primaryModel,
      circuitOpen: circuitStatus().open,
      appRequestsToday: usage.appRequests,
    },
  });
}
