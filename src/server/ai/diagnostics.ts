import "server-only";
import { getCatalog } from "@/server/ai/catalog";
import { openRouterConfig, aiLiveConfigured } from "@/server/ai/config";
import { usageSnapshot } from "@/server/ai/limits";
import { readOutcomes } from "@/server/ai/outcomes";

export async function diagnosticsReport() {
  const cfg = openRouterConfig();
  const catalog = await getCatalog();
  const { fetchKeyInfo } = await import("@/server/ai/openrouter");
  const keyInfo = await fetchKeyInfo();
  const outcomes = readOutcomes();
  const eligible = catalog.eligible.map((model) => ({
    id: model.id,
    name: model.name,
    pricing: model.pricing,
    contextLength: model.contextLength,
    modality: model.modality,
    supportedParameters: model.supportedParameters,
    expirationDate: model.expirationDate,
    lastOutcome: outcomes.get(model.id)?.outcome ?? null,
    lastOutcomeAt: outcomes.get(model.id)?.at ?? null,
  }));
  return {
    verifiedAt: new Date().toISOString(),
    liveConfigured: aiLiveConfigured(),
    freeOnly: cfg.freeOnly,
    primaryModel: cfg.primaryModel,
    fallbackModels: cfg.fallbackModels,
    usingOpenRouter: cfg.usingOpenRouter,
    catalog: {
      fetchedAt: catalog.fetchedAt ? new Date(catalog.fetchedAt).toISOString() : null,
      source: catalog.source,
      error: catalog.error,
      eligibleCount: catalog.eligible.length,
      totalCount: catalog.models.length,
    },
    eligible,
    usage: usageSnapshot(),
    key: keyInfo,
  };
}

export async function connectionTest(userId: string | null) {
  const { chatCompletion } = await import("@/server/ai/openrouter");
  const started = Date.now();
  const result = await chatCompletion({
    purpose: "diag",
    userId,
    maxTokens: 32,
    temperature: 0,
    messages: [
      { role: "system", content: "Reply with exactly: CASEFILE_OK" },
      { role: "user", content: "ping" },
    ],
  });
  return {
    ok: Boolean(result?.text),
    latencyMs: Date.now() - started,
    modelRequested: result?.modelRequested ?? null,
    modelReturned: result?.modelReturned ?? null,
    tokens: result?.tokens ?? 0,
    preview: result?.text?.slice(0, 80) ?? null,
  };
}
