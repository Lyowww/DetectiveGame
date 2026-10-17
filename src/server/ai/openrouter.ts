import "server-only";
import { assertModelAllowed, getCatalog } from "@/server/ai/catalog";
import { openRouterConfig } from "@/server/ai/config";
import {
  canSpend,
  circuitOpen,
  recordProviderFailure,
  recordProviderSuccess,
  recordSpend,
} from "@/server/ai/limits";
import { noteOutcome } from "@/server/ai/outcomes";

export type ErrorCategory =
  | "auth"
  | "validation"
  | "rate_limit"
  | "quota"
  | "timeout"
  | "model_unavailable"
  | "network"
  | "malformed"
  | "policy"
  | "unknown";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  maxTokens: number;
  temperature?: number;
  responseFormat?: { type: "json_object" } | { type: "json_schema"; json_schema: unknown };
  userId?: string | null;
  purpose: "phrase" | "interpret" | "diag" | "benchmark";
}

export interface ChatResult {
  text: string;
  modelRequested: string;
  modelReturned: string | null;
  tokens: number;
  latencyMs: number;
  attempts: number;
}

export class AiProviderError extends Error {
  category: ErrorCategory;
  status: number | null;
  retryAfterMs: number | null;
  accountWide: boolean;

  constructor(
    message: string,
    opts: { category: ErrorCategory; status?: number | null; retryAfterMs?: number | null; accountWide?: boolean },
  ) {
    super(message);
    this.category = opts.category;
    this.status = opts.status ?? null;
    this.retryAfterMs = opts.retryAfterMs ?? null;
    this.accountWide = Boolean(opts.accountWide);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitter(base: number) {
  return base + Math.floor(Math.random() * Math.min(400, base));
}

function classifyHttp(status: number, body: unknown): { category: ErrorCategory; accountWide: boolean; message: string } {
  const err = (body as { error?: { message?: string; code?: number; metadata?: Record<string, unknown> } })?.error;
  const message = err?.message ?? `provider-http-${status}`;
  const meta = err?.metadata ?? {};
  if (status === 401 || status === 403) {
    const source = String(meta.limit_source ?? "");
    if (source.includes("budget") || source.includes("credit") || source.includes("key_limit")) {
      return { category: "quota", accountWide: true, message };
    }
    return { category: "auth", accountWide: status === 401, message };
  }
  if (status === 402) return { category: "quota", accountWide: true, message };
  if (status === 429) {
    const type = String(meta.error_type ?? "");
    const accountWide = type.includes("rate_limit") && !meta.provider_code;
    return { category: "rate_limit", accountWide, message };
  }
  if (status === 400) return { category: "validation", accountWide: false, message };
  if (status === 404) return { category: "model_unavailable", accountWide: false, message };
  return { category: "unknown", accountWide: false, message };
}

function freeOnlyProviderPrefs() {
  return {
    // Official zero-price ceiling: reject paid providers for this request.
    max_price: { prompt: 0, completion: 0, request: 0, image: 0 },
    allow_fallbacks: true,
    require_parameters: true,
  };
}

async function modelQueue(): Promise<string[]> {
  const cfg = openRouterConfig();
  const ordered = [cfg.primaryModel, ...cfg.fallbackModels].filter(Boolean);
  const unique: string[] = [];
  for (const id of ordered) {
    if (!unique.includes(id)) unique.push(id);
  }
  if (!cfg.freeOnly) return unique.length ? unique : [cfg.legacy.model];

  const allowed: string[] = [];
  for (const id of unique) {
    const check = await assertModelAllowed(id);
    if (check.ok) allowed.push(id);
    else noteOutcome(id, `reject:${check.reason}`);
  }
  if (!allowed.length) {
    const check = await assertModelAllowed("openrouter/free");
    if (check.ok) allowed.push("openrouter/free");
  }
  return allowed;
}

async function postChat(
  model: string,
  request: ChatRequest,
  signal: AbortSignal,
): Promise<{ text: string; modelReturned: string | null; tokens: number }> {
  const cfg = openRouterConfig();
  if (!cfg.usingOpenRouter && cfg.legacy.enabled) {
    const response = await fetch(`${cfg.legacy.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${cfg.legacy.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: cfg.legacy.model,
        temperature: request.temperature ?? 0.35,
        max_tokens: request.maxTokens,
        messages: request.messages,
        response_format: request.responseFormat,
      }),
      signal,
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const classified = classifyHttp(response.status, json);
      throw new AiProviderError(classified.message, {
        category: classified.category,
        status: response.status,
        accountWide: classified.accountWide,
      });
    }
    const text = String((json as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content ?? "").trim();
    const tokens = Number((json as { usage?: { total_tokens?: number } }).usage?.total_tokens ?? 0) || request.maxTokens;
    return { text, modelReturned: cfg.legacy.model, tokens };
  }

  const body: Record<string, unknown> = {
    model,
    messages: request.messages,
    temperature: request.temperature ?? 0.35,
    max_tokens: request.maxTokens,
    stream: false,
  };
  if (request.responseFormat) body.response_format = request.responseFormat;
  if (cfg.freeOnly) body.provider = freeOnlyProviderPrefs();
  // Never attach plugins / tools / web search.

  const response = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${cfg.apiKey}`,
      "content-type": "application/json",
      "http-referer": cfg.siteUrl,
      "x-title": cfg.appTitle,
    },
    body: JSON.stringify(body),
    signal,
  });
  const retryAfterHeader = response.headers.get("retry-after");
  const retryAfterMs = retryAfterHeader && /^\d+$/.test(retryAfterHeader) ? Number(retryAfterHeader) * 1000 : null;
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const classified = classifyHttp(response.status, json);
    if (/model|provider|unavailable|no (eligible|endpoints)/i.test(classified.message)) {
      throw new AiProviderError(classified.message, {
        category: "model_unavailable",
        status: response.status,
        retryAfterMs,
        accountWide: classified.accountWide,
      });
    }
    throw new AiProviderError(classified.message, {
      category: classified.category,
      status: response.status,
      retryAfterMs,
      accountWide: classified.accountWide,
    });
  }
  const text = String((json as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content ?? "").trim();
  if (!text) {
    throw new AiProviderError("empty-completion", { category: "malformed", status: response.status });
  }
  const modelReturned = typeof (json as { model?: string }).model === "string" ? (json as { model: string }).model : null;
  if (cfg.freeOnly && modelReturned && modelReturned !== model) {
    let check = await assertModelAllowed(modelReturned);
    if (!check.ok) {
      await getCatalog({ force: true });
      check = await assertModelAllowed(modelReturned);
    }
    if (!check.ok) {
      throw new AiProviderError(`returned-model-not-free:${modelReturned}`, {
        category: "policy",
        status: 402,
        accountWide: false,
      });
    }
  }
  const tokens = Number((json as { usage?: { total_tokens?: number } }).usage?.total_tokens ?? 0) || Math.ceil(text.length / 4);
  return { text, modelReturned, tokens };
}

export async function chatCompletion(request: ChatRequest): Promise<ChatResult | null> {
  const cfg = openRouterConfig();
  if (!cfg.usingOpenRouter && !cfg.legacy.enabled) return null;
  if (circuitOpen()) {
    noteOutcome(cfg.primaryModel, "circuit-open");
    return null;
  }
  const gate = canSpend(request.userId ?? null);
  if (!gate.ok) {
    noteOutcome(cfg.primaryModel, gate.reason);
    return null;
  }

  const models = cfg.usingOpenRouter ? await modelQueue() : [cfg.legacy.model];
  if (!models.length) {
    noteOutcome(cfg.primaryModel, "no-eligible-models");
    return null;
  }

  let attempts = 0;
  let lastError: AiProviderError | null = null;
  const started = Date.now();

  for (const model of models) {
    for (let tryIndex = 0; tryIndex < cfg.maxAttempts; tryIndex += 1) {
      attempts += 1;
      try {
        const result = await postChat(model, request, AbortSignal.timeout(cfg.timeoutMs));
        recordProviderSuccess();
        recordSpend(request.userId ?? null, result.tokens);
        noteOutcome(result.modelReturned ?? model, "ok");
        return {
          text: result.text,
          modelRequested: model,
          modelReturned: result.modelReturned,
          tokens: result.tokens,
          latencyMs: Date.now() - started,
          attempts,
        };
      } catch (error) {
        const typed =
          error instanceof AiProviderError
            ? error
            : new AiProviderError(error instanceof Error ? error.message : "unknown", {
                category: error instanceof Error && /abort|timeout/i.test(error.message) ? "timeout" : "network",
              });
        lastError = typed;
        noteOutcome(model, `${typed.category}:${typed.message.slice(0, 80)}`);
        recordProviderFailure(typed.message, typed.accountWide);

        if (typed.category === "auth" || typed.category === "validation" || typed.category === "policy") {
          return null;
        }
        if (typed.accountWide && (typed.category === "quota" || typed.category === "rate_limit")) {
          return null;
        }
        if (typed.category === "model_unavailable") {
          await getCatalog({ force: true });
          break; // next model
        }
        const wait = typed.retryAfterMs ?? jitter(300 * 2 ** tryIndex);
        if (tryIndex < cfg.maxAttempts - 1) await sleep(wait);
      }
    }
  }
  if (lastError) noteOutcome(models[0] ?? cfg.primaryModel, `fail:${lastError.category}`);
  return null;
}

export async function fetchKeyInfo(): Promise<unknown | null> {
  const cfg = openRouterConfig();
  if (!cfg.usingOpenRouter || !cfg.apiKey) return null;
  try {
    const response = await fetch(`${cfg.baseUrl}/key`, {
      headers: {
        authorization: `Bearer ${cfg.apiKey}`,
        "http-referer": cfg.siteUrl,
        "x-title": cfg.appTitle,
      },
      signal: AbortSignal.timeout(cfg.timeoutMs),
      cache: "no-store",
    });
    if (!response.ok) return { error: `key-http-${response.status}` };
    return response.json();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "key-failed" };
  }
}
