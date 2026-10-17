import "server-only";
import { openRouterConfig } from "@/server/ai/config";

export interface CatalogModel {
  id: string;
  name: string;
  pricing: Record<string, string | undefined>;
  contextLength: number | null;
  modality: string | null;
  inputModalities: string[];
  outputModalities: string[];
  supportedParameters: string[];
  expirationDate: string | null;
  eligibleFreeText: boolean;
  rejectReason: string | null;
  lastOutcome?: string;
}

export interface CatalogSnapshot {
  fetchedAt: number;
  source: "live" | "cache" | "empty";
  models: CatalogModel[];
  eligible: CatalogModel[];
  error: string | null;
}

const CHARGEABLE_PRICE_FIELDS = [
  "prompt",
  "completion",
  "request",
  "image",
  "image_output",
  "audio",
  "audio_output",
  "web_search",
  "internal_reasoning",
] as const;

let cache: CatalogSnapshot | null = null;
let inflight: Promise<CatalogSnapshot> | null = null;

export function parsePrice(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function expired(date: string | null | undefined, now = Date.now()) {
  if (!date) return false;
  const t = Date.parse(date);
  return Number.isFinite(t) && t <= now;
}

/** Zero-cost text generation eligibility from official catalog pricing metadata. */
export function evaluateFreeTextEligibility(raw: {
  id?: string;
  name?: string;
  pricing?: Record<string, unknown>;
  context_length?: number;
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
  };
  supported_parameters?: string[];
  expiration_date?: string | null;
}): { ok: boolean; reason: string | null } {
  const id = raw.id ?? "";
  if (!id) return { ok: false, reason: "missing-id" };
  if (expired(raw.expiration_date ?? null)) return { ok: false, reason: "expired" };

  const pricing = raw.pricing ?? {};
  const prompt = parsePrice(pricing.prompt);
  const completion = parsePrice(pricing.completion);
  if (prompt == null || completion == null) return { ok: false, reason: "pricing-missing" };
  if (prompt !== 0 || completion !== 0) return { ok: false, reason: "nonzero-token-price" };

  for (const field of CHARGEABLE_PRICE_FIELDS) {
    if (!(field in pricing)) continue;
    const value = parsePrice(pricing[field]);
    if (value == null) return { ok: false, reason: `pricing-invalid:${field}` };
    if (value !== 0) return { ok: false, reason: `nonzero:${field}` };
  }

  const outputs = raw.architecture?.output_modalities ?? [];
  if (!outputs.includes("text")) return { ok: false, reason: "no-text-output" };
  // Dialogue path is text-only; reject image/audio/video generators even if priced at zero.
  if (outputs.some((item) => item !== "text")) return { ok: false, reason: "non-text-output" };

  // Suffix alone is never proof; zero pricing already checked above.
  return { ok: true, reason: null };
}

function normalizeModel(raw: Record<string, unknown>): CatalogModel {
  const architecture = (raw.architecture ?? {}) as {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
  };
  const pricingRaw = (raw.pricing ?? {}) as Record<string, unknown>;
  const pricing: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(pricingRaw)) {
    pricing[key] = value == null ? undefined : String(value);
  }
  const verdict = evaluateFreeTextEligibility({
    id: String(raw.id ?? ""),
    name: String(raw.name ?? raw.id ?? ""),
    pricing: pricingRaw,
    context_length: typeof raw.context_length === "number" ? raw.context_length : undefined,
    architecture,
    supported_parameters: Array.isArray(raw.supported_parameters) ? (raw.supported_parameters as string[]) : [],
    expiration_date: (raw.expiration_date as string | null | undefined) ?? null,
  });
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? raw.id ?? ""),
    pricing,
    contextLength: typeof raw.context_length === "number" ? raw.context_length : null,
    modality: architecture.modality ?? null,
    inputModalities: architecture.input_modalities ?? [],
    outputModalities: architecture.output_modalities ?? [],
    supportedParameters: Array.isArray(raw.supported_parameters) ? (raw.supported_parameters as string[]) : [],
    expirationDate: (raw.expiration_date as string | null | undefined) ?? null,
    eligibleFreeText: verdict.ok,
    rejectReason: verdict.reason,
  };
}

async function fetchCatalog(force: boolean): Promise<CatalogSnapshot> {
  const cfg = openRouterConfig();
  const now = Date.now();
  if (!force && cache && now - cache.fetchedAt < cfg.catalogTtlMs) {
    return { ...cache, source: "cache" };
  }
  if (!force && cache && now - cache.fetchedAt < cfg.catalogMaxStaleMs && cache.eligible.length) {
    // Serve cache while refreshing in background if slightly stale but still usable.
  }
  if (!cfg.apiKey && !cfg.legacy.enabled) {
    const empty: CatalogSnapshot = {
      fetchedAt: now,
      source: "empty",
      models: [],
      eligible: [],
      error: "missing-api-key",
    };
    cache = empty;
    return empty;
  }
  try {
    const response = await fetch(`${cfg.baseUrl}/models`, {
      headers: {
        authorization: `Bearer ${cfg.apiKey}`,
        "http-referer": cfg.siteUrl,
        "x-title": cfg.appTitle,
      },
      signal: AbortSignal.timeout(cfg.timeoutMs),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`catalog-http-${response.status}`);
    const json = (await response.json()) as { data?: Record<string, unknown>[] };
    const models = (json.data ?? []).map((item) => normalizeModel(item));
    // Ensure documented free router is represented when eligible.
    if (!models.some((item) => item.id === "openrouter/free")) {
      const router = normalizeModel({
        id: "openrouter/free",
        name: "Free Models Router",
        pricing: { prompt: "0", completion: "0" },
        context_length: 200000,
        architecture: { modality: "text+image->text", input_modalities: ["text", "image"], output_modalities: ["text"] },
        supported_parameters: ["max_tokens", "temperature", "response_format", "structured_outputs"],
        expiration_date: null,
      });
      models.unshift(router);
    }
    const eligible = models.filter((item) => item.eligibleFreeText);
    const snap: CatalogSnapshot = {
      fetchedAt: now,
      source: "live",
      models,
      eligible,
      error: null,
    };
    cache = snap;
    return snap;
  } catch (error) {
    if (cache && now - cache.fetchedAt < cfg.catalogMaxStaleMs) {
      return { ...cache, source: "cache", error: error instanceof Error ? error.message : "catalog-failed" };
    }
    const empty: CatalogSnapshot = {
      fetchedAt: now,
      source: "empty",
      models: cache?.models ?? [],
      eligible: cache?.eligible ?? [],
      error: error instanceof Error ? error.message : "catalog-failed",
    };
    cache = empty;
    return empty;
  }
}

export async function getCatalog(options?: { force?: boolean }): Promise<CatalogSnapshot> {
  if (options?.force) {
    cache = null;
    inflight = null;
  }
  if (!inflight) {
    inflight = fetchCatalog(Boolean(options?.force)).finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

export function catalogIsFreshEnough(snap: CatalogSnapshot) {
  const cfg = openRouterConfig();
  return Date.now() - snap.fetchedAt < cfg.catalogMaxStaleMs && snap.eligible.length > 0;
}

export async function assertModelAllowed(modelId: string): Promise<{ ok: true; model: CatalogModel } | { ok: false; reason: string }> {
  const cfg = openRouterConfig();
  if (!cfg.freeOnly) {
    return {
      ok: true,
      model: {
        id: modelId,
        name: modelId,
        pricing: {},
        contextLength: null,
        modality: null,
        inputModalities: ["text"],
        outputModalities: ["text"],
        supportedParameters: [],
        expirationDate: null,
        eligibleFreeText: true,
        rejectReason: null,
      },
    };
  }
  if (modelId === "openrouter/auto") return { ok: false, reason: "paid-router-forbidden" };
  const snap = await getCatalog();
  if (!catalogIsFreshEnough(snap) && snap.source === "empty") {
    return { ok: false, reason: "catalog-stale" };
  }
  const found = snap.models.find((item) => item.id === modelId);
  if (!found) {
    // Refresh once on unknown id.
    const refreshed = await getCatalog({ force: true });
    const again = refreshed.models.find((item) => item.id === modelId) ?? refreshed.eligible.find((item) => item.id === modelId);
    if (!again) return { ok: false, reason: "model-not-in-catalog" };
    if (!again.eligibleFreeText) return { ok: false, reason: again.rejectReason ?? "not-free" };
    return { ok: true, model: again };
  }
  if (!found.eligibleFreeText) return { ok: false, reason: found.rejectReason ?? "not-free" };
  return { ok: true, model: found };
}

export function __resetCatalogForTests() {
  cache = null;
  inflight = null;
}
