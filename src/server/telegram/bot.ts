import "server-only";
import { createHash, timingSafeEqual } from "crypto";
import { ensureDb } from "@/server/db";
import * as tables from "@/server/db/schema";
import { identityByTelegram, latestActiveRun, rememberChat, setNotify } from "@/server/telegram/identity";

export function botConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_WEBHOOK_SECRET);
}

export function publicBot() {
  return {
    configured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    username: process.env.TELEGRAM_BOT_USERNAME ?? "",
    appUrl: process.env.APP_URL ?? process.env.BETTER_AUTH_URL ?? "",
    shortName: process.env.TELEGRAM_APP_SHORT_NAME ?? "",
  };
}

export function devMockEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.CASEFILE_TELEGRAM_DEV === "1";
}

function appLink(start: string) {
  const info = publicBot();
  if (info.username && info.shortName) return `https://t.me/${info.username}/${info.shortName}?startapp=${start}`;
  if (info.username) return `https://t.me/${info.username}?startapp=${start}`;
  return info.appUrl || "/";
}

function keyboard(start: string) {
  const info = publicBot();
  if (info.appUrl.startsWith("https://")) {
    return { inline_keyboard: [[{ text: "Open CASEFILE", web_app: { url: info.appUrl } }]] };
  }
  return { inline_keyboard: [[{ text: "Open CASEFILE", url: appLink(start) }]] };
}

export async function telegramApi(method: string, body: Record<string, unknown>) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, configured: false };
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  return response.json() as Promise<{ ok: boolean }>;
}

export function webhookAuthorized(header: string | null) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";
  if (!secret || !header) return false;
  const left = createHash("sha256").update(header).digest();
  const right = createHash("sha256").update(secret).digest();
  return timingSafeEqual(left, right);
}

export async function claimUpdate(updateId: number) {
  const database = await ensureDb();
  const inserted = await database
    .insert(tables.botUpdate)
    .values({ updateId: String(updateId), receivedAt: new Date() })
    .onConflictDoNothing()
    .returning();
  return inserted.length > 0;
}

async function reply(chatId: number, text: string, start = "home") {
  await telegramApi("sendMessage", { chat_id: chatId, text, reply_markup: keyboard(start) });
}

export async function handleUpdate(update: {
  update_id: number;
  message?: { text?: string; chat: { id: number }; from?: { id: number }; voice?: unknown };
}) {
  const fresh = await claimUpdate(update.update_id);
  if (!fresh) return;
  const message = update.message;
  if (!message?.from) return;
  const text = (message.text ?? "").trim();
  const command = text.split(/\s+/)[0]?.split("@")[0] ?? "";
  const identity = await identityByTelegram(String(message.from.id));
  if (identity) await rememberChat(identity.telegramUserId, String(message.chat.id));

  if (message.voice) {
    await reply(message.chat.id, "Voice notes in this chat stay here. Open the case and record or type there. This chat does not add evidence.");
    return;
  }
  if (command === "/start" || command === "/play") {
    await reply(message.chat.id, "CASEFILE is the investigation. You keep the notes. The file keeps the records.", command === "/play" ? "case" : "home");
    return;
  }
  if (command === "/continue") {
    const run = identity ? await latestActiveRun(identity.userId) : null;
    await reply(message.chat.id, run ? "Your open file is still on the desk." : "There is no open file yet.", "home");
    return;
  }
  if (command === "/help") {
    await reply(message.chat.id, "Interview people, save what they say, and compare the records yourself. /play opens a case. /continue returns to an open file. /settings turns reminders off.");
    return;
  }
  if (command === "/settings") {
    if (!identity) {
      await reply(message.chat.id, "Open CASEFILE once, then return here to choose reminders.");
      return;
    }
    const next = !identity.notify;
    await setNotify(identity.userId, next);
    await rememberChat(identity.telegramUserId, String(message.chat.id));
    await reply(message.chat.id, next ? "Reminders are on. They will not contain answers. Send /settings to stop." : "Reminders are off.");
  }
}

export async function configureBot() {
  const info = publicBot();
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_WEBHOOK_SECRET || !info.appUrl.startsWith("https://")) {
    return { ok: false, reason: "APP_URL must be https and the bot token and webhook secret must be set." };
  }
  const hook = await telegramApi("setWebhook", {
    url: `${info.appUrl.replace(/\/$/, "")}/api/telegram/webhook`,
    secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: ["message"],
    drop_pending_updates: false,
  });
  await telegramApi("setMyCommands", {
    commands: [
      { command: "start", description: "Welcome and open CASEFILE" },
      { command: "play", description: "Open the case library" },
      { command: "continue", description: "Resume the open investigation" },
      { command: "help", description: "How the investigation works" },
      { command: "settings", description: "Turn reminders on or off" },
    ],
  });
  if (info.appUrl.startsWith("https://")) {
    await telegramApi("setChatMenuButton", {
      menu_button: { type: "web_app", text: "CASEFILE", web_app: { url: info.appUrl } },
    });
  }
  return { ok: hook.ok === true };
}
