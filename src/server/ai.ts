import "server-only";
import type { GameAction } from "@/lib/actions";
import { actionSchema } from "@/lib/actions";
import type { Lang } from "@/lib/types";
import { getCase } from "@/server/cases/catalog";
import { aiLiveConfigured, openRouterConfig } from "@/server/ai/config";
import { withinBudget as tokenWithinBudget } from "@/server/ai/limits";
import { chatCompletion } from "@/server/ai/openrouter";

export function aiConfigured() {
  return aiLiveConfigured();
}

export function speechConfigured() {
  // Speech is separate from OpenRouter text inference. Never treat an OpenRouter key as a speech key.
  if (process.env.SPEECH_API_KEY) return true;
  return openRouterConfig().legacy.enabled;
}

export function ttsConfigured() {
  return speechConfigured() && process.env.CASEFILE_TTS !== "off";
}

export function withinBudget(used: number) {
  return tokenWithinBudget(used);
}

export async function phraseInCharacter(input: {
  caseId: string;
  characterId: string;
  canonical: string;
  playerText: string;
  language: Lang;
  userId?: string | null;
}): Promise<{ text: string; tokens: number; modelReturned?: string | null } | null> {
  if (!aiConfigured()) return null;
  const person = getCase(input.caseId).characters.find((item) => item.id === input.characterId);
  if (!person) return null;

  const result = await chatCompletion({
    purpose: "phrase",
    userId: input.userId ?? null,
    maxTokens: 120,
    temperature: 0.35,
    messages: [
      {
        role: "system",
        content:
          "Phrase a fictional detective-game reply in 1–3 short sentences (about 20–55 words). Use only the canonical facts. Do not add times, amounts, names, places, or events that are not in the canonical text. Do not confess unless the canonical text confesses. Do not repeat the player's question or summarize the case. Do not reveal other characters' private knowledge. Keep the character's manner. Reply in the requested language with the spoken line only.",
      },
      {
        role: "user",
        content: JSON.stringify({
          language: input.language,
          manner: person.speechStyle,
          player: input.playerText,
          canonical: input.canonical,
        }),
      },
    ],
  });
  if (!result) return null;
  let text = result.text.trim();
  if (text.split(/\s+/).length > 70) text = input.canonical;
  return { text: text || input.canonical, tokens: result.tokens, modelReturned: result.modelReturned };
}

export async function interpretUtterance(input: {
  caseId: string;
  text: string;
  language: Lang;
  locationId: string;
  discovered: string[];
  presentCharacterIds: string[];
  userId?: string | null;
}): Promise<{ action: GameAction; tokens: number; modelReturned?: string | null } | null> {
  if (!aiConfigured()) return null;
  const def = getCase(input.caseId);
  const allowed = {
    types: ["travel", "inspect", "request_record", "interview", "compare", "hint_preview"],
    locations: def.locations.filter((place) => place.visitable).map((place) => place.id),
    characters: input.presentCharacterIds,
    records: def.locations.flatMap((place) => place.records.map((record) => record.id)),
    evidence: input.discovered,
  };
  const result = await chatCompletion({
    purpose: "interpret",
    userId: input.userId ?? null,
    maxTokens: 220,
    temperature: 0,
    responseFormat: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Map a detective's sentence to one JSON object with an action field. Use only ids from the allowlist. If you cannot map it, return {\"action\":null}. Never invent evidence or a conclusion. Never unlock secrets.",
      },
      {
        role: "user",
        content: JSON.stringify({
          sentence: input.text,
          language: input.language,
          locationId: input.locationId,
          allowed,
        }),
      },
    ],
  });
  if (!result) return null;
  try {
    const raw = JSON.parse(result.text) as { action?: unknown };
    const parsed = actionSchema.safeParse(raw.action);
    if (!parsed.success) return null;
    return { action: parsed.data, tokens: result.tokens, modelReturned: result.modelReturned };
  } catch {
    return null;
  }
}
