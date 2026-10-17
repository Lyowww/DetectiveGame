import "server-only";
import { speechConfigured, ttsConfigured } from "@/server/ai";

/**
 * Retention: audio bytes are forwarded to the configured provider and are not
 * written to disk or the database. The request body is discarded when the
 * response finishes. Only a transcript the player confirms is stored, and it
 * is stored as text on the investigation run.
 */
export { speechConfigured, ttsConfigured };

function base() {
  const speechBase = process.env.SPEECH_BASE_URL;
  if (speechBase) return speechBase.replace(/\/$/, "");
  // Never default speech to OpenRouter; it is text-only in this app.
  const aiBase = process.env.AI_BASE_URL ?? "https://api.openai.com/v1";
  if (/openrouter\.ai/i.test(aiBase)) return "https://api.openai.com/v1";
  return aiBase.replace(/\/$/, "");
}

function key() {
  if (process.env.SPEECH_API_KEY) return process.env.SPEECH_API_KEY;
  // Reuse a legacy non-OpenRouter AI key only. OpenRouter keys are not speech keys.
  if (process.env.OPENROUTER_API_KEY && process.env.AI_API_KEY === process.env.OPENROUTER_API_KEY) return "";
  if (process.env.OPENROUTER_API_KEY && !process.env.AI_API_KEY) return "";
  if (/openrouter\.ai/i.test(process.env.AI_BASE_URL ?? "")) return "";
  return process.env.AI_API_KEY || "";
}

export async function transcribe(audio: Blob, filename: string): Promise<string> {
  const form = new FormData();
  form.set("file", audio, filename);
  form.set("model", process.env.SPEECH_TRANSCRIBE_MODEL ?? "whisper-1");
  const response = await fetch(`${base()}/audio/transcriptions`, {
    method: "POST",
    headers: { authorization: `Bearer ${key()}` },
    body: form,
    signal: AbortSignal.timeout(Number(process.env.AI_TIMEOUT_MS ?? 20000)),
  });
  if (!response.ok) throw new Error(`Transcription failed (${response.status})`);
  const json = (await response.json()) as { text?: string };
  return json.text ?? "";
}

const VOICES: Record<string, string> = {
  elena: "coral",
  jonah: "ash",
  owen: "ballad",
  marcus: "sage",
  priya: "verse",
};

export async function speak(text: string, characterId: string): Promise<ArrayBuffer> {
  const configured = (process.env.SPEECH_VOICES ?? "")
    .split(",")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((map, pair) => {
      const [id, voice] = pair.split(":");
      if (id && voice) map[id] = voice;
      return map;
    }, {});
  const response = await fetch(`${base()}/audio/speech`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.SPEECH_TTS_MODEL ?? "gpt-4o-mini-tts",
      voice: configured[characterId] ?? VOICES[characterId] ?? "alloy",
      input: text.slice(0, 2000),
    }),
    signal: AbortSignal.timeout(Number(process.env.AI_TIMEOUT_MS ?? 20000)),
  });
  if (!response.ok) throw new Error(`Speech failed (${response.status})`);
  return response.arrayBuffer();
}
