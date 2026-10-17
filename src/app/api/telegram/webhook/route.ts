import { NextResponse } from "next/server";
import { botConfigured, handleUpdate, webhookAuthorized } from "@/server/telegram/bot";
import { allow } from "@/server/telegram/limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!botConfigured()) return NextResponse.json({ configured: false }, { status: 503 });
  if (!allow("tg-webhook", 120, 60_000)) return NextResponse.json({ ok: true });
  if (!webhookAuthorized(request.headers.get("x-telegram-bot-api-secret-token"))) {
    return NextResponse.json({ error: "Rejected." }, { status: 401 });
  }
  const update = await request.json().catch(() => null) as { update_id?: unknown; message?: { text?: string; chat?: { id?: number }; from?: { id?: number }; voice?: unknown } } | null;
  if (!update || typeof update.update_id !== "number" || !update.message?.chat?.id || !update.message.from?.id) {
    return NextResponse.json({ ok: true });
  }
  await handleUpdate({
    update_id: update.update_id,
    message: {
      text: typeof update.message.text === "string" ? update.message.text.slice(0, 500) : undefined,
      chat: { id: update.message.chat.id },
      from: { id: update.message.from.id },
      voice: update.message.voice ? {} : undefined,
    },
  });
  return NextResponse.json({ ok: true });
}
