import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __resetCatalogForTests,
  assertModelAllowed,
  evaluateFreeTextEligibility,
  getCatalog,
  parsePrice,
} from "@/server/ai/catalog";
import { __resetLimitsForTests } from "@/server/ai/limits";
import { __resetOutcomesForTests } from "@/server/ai/outcomes";
import { chatCompletion } from "@/server/ai/openrouter";

afterEach(() => {
  __resetCatalogForTests();
  __resetLimitsForTests();
  __resetOutcomesForTests();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("free catalog eligibility", () => {
  it("parses numeric price strings and rejects missing pricing", () => {
    expect(parsePrice("0")).toBe(0);
    expect(parsePrice("0.0")).toBe(0);
    expect(parsePrice("")).toBeNull();
    expect(parsePrice(undefined)).toBeNull();
    expect(evaluateFreeTextEligibility({ id: "x", pricing: {} }).ok).toBe(false);
    expect(evaluateFreeTextEligibility({ id: "x", pricing: { prompt: "0" } }).reason).toBe("pricing-missing");
  });

  it("rejects nonzero prompt/completion and chargeable extras", () => {
    expect(
      evaluateFreeTextEligibility({
        id: "paid/model",
        pricing: { prompt: "0", completion: "0.000001" },
      }).ok,
    ).toBe(false);
    expect(
      evaluateFreeTextEligibility({
        id: "tool/model:free",
        pricing: { prompt: "0", completion: "0", web_search: "0.01" },
      }).reason,
    ).toBe("nonzero:web_search");
  });

  it("does not treat :free suffix alone as proof", () => {
    const verdict = evaluateFreeTextEligibility({
      id: "vendor/model:free",
      pricing: { prompt: "0.1", completion: "0" },
    });
    expect(verdict.ok).toBe(false);
  });

  it("rejects zero-price models that emit non-text outputs", () => {
    expect(
      evaluateFreeTextEligibility({
        id: "vendor/audio",
        pricing: { prompt: "0", completion: "0" },
        architecture: { output_modalities: ["text", "audio"] },
      }).reason,
    ).toBe("non-text-output");
  });

  it("accepts verified zero-price text models and openrouter/free", () => {
    expect(
      evaluateFreeTextEligibility({
        id: "openrouter/free",
        pricing: { prompt: "0", completion: "0" },
        architecture: { output_modalities: ["text"], input_modalities: ["text", "image"] },
      }).ok,
    ).toBe(true);
    expect(
      evaluateFreeTextEligibility({
        id: "meta/llama:free",
        pricing: { prompt: "0", completion: "0", image: "0" },
        architecture: { output_modalities: ["text"], input_modalities: ["text"] },
      }).ok,
    ).toBe(true);
  });

  it("rejects expired models", () => {
    expect(
      evaluateFreeTextEligibility({
        id: "old/model:free",
        pricing: { prompt: "0", completion: "0" },
        expiration_date: "2020-01-01",
        architecture: { output_modalities: ["text"] },
      }).reason,
    ).toBe("expired");
  });
});

describe("openrouter free-only adapter", () => {
  it("filters catalog and never selects openrouter/auto", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    vi.stubEnv("OPENROUTER_FREE_ONLY", "true");
    vi.stubEnv("OPENROUTER_PRIMARY_MODEL", "openrouter/free");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/models")) {
          return new Response(
            JSON.stringify({
              data: [
                {
                  id: "openrouter/free",
                  name: "Free Models Router",
                  pricing: { prompt: "0", completion: "0" },
                  context_length: 200000,
                  architecture: { modality: "text+image->text", input_modalities: ["text", "image"], output_modalities: ["text"] },
                  supported_parameters: ["max_tokens", "response_format"],
                },
                {
                  id: "paid/model",
                  name: "Paid",
                  pricing: { prompt: "1", completion: "2" },
                  architecture: { output_modalities: ["text"], input_modalities: ["text"] },
                },
                {
                  id: "vendor/ok:free",
                  name: "Ok Free",
                  pricing: { prompt: "0", completion: "0" },
                  architecture: { output_modalities: ["text"], input_modalities: ["text"] },
                  supported_parameters: ["max_tokens"],
                },
              ],
            }),
            { status: 200 },
          );
        }
        throw new Error(`unexpected fetch ${url}`);
      }),
    );
    const catalog = await getCatalog({ force: true });
    expect(catalog.eligible.map((item) => item.id).sort()).toEqual(["openrouter/free", "vendor/ok:free"].sort());
    expect(catalog.eligible.some((item) => item.id === "paid/model")).toBe(false);
    await expect(assertModelAllowed("openrouter/auto")).resolves.toMatchObject({ ok: false });
    await expect(assertModelAllowed("paid/model")).resolves.toMatchObject({ ok: false });
    await expect(assertModelAllowed("openrouter/free")).resolves.toMatchObject({ ok: true });
  });

  it("does not fall back to a paid model when free routing fails", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    vi.stubEnv("OPENROUTER_FREE_ONLY", "true");
    vi.stubEnv("OPENROUTER_PRIMARY_MODEL", "openrouter/free");
    vi.stubEnv("OPENROUTER_FALLBACK_MODELS", "paid/model,vendor/ok:free");
    vi.stubEnv("OPENROUTER_MAX_ATTEMPTS", "1");
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/models")) {
          return new Response(
            JSON.stringify({
              data: [
                {
                  id: "openrouter/free",
                  pricing: { prompt: "0", completion: "0" },
                  architecture: { output_modalities: ["text"] },
                },
                {
                  id: "paid/model",
                  pricing: { prompt: "1", completion: "1" },
                  architecture: { output_modalities: ["text"] },
                },
                {
                  id: "vendor/ok:free",
                  pricing: { prompt: "0", completion: "0" },
                  architecture: { output_modalities: ["text"] },
                },
              ],
            }),
            { status: 200 },
          );
        }
        if (url.endsWith("/chat/completions")) {
          const body = JSON.parse(String(init?.body ?? "{}")) as { model?: string; provider?: { max_price?: unknown } };
          calls.push(body.model ?? "");
          expect(body.provider?.max_price).toEqual({ prompt: 0, completion: 0, request: 0, image: 0 });
          if (body.model === "openrouter/free") {
            return new Response(JSON.stringify({ error: { message: "No endpoints available", code: 404 } }), { status: 404 });
          }
          if (body.model === "vendor/ok:free") {
            return new Response(
              JSON.stringify({
                model: "vendor/ok:free",
                choices: [{ message: { content: "Short line." } }],
                usage: { total_tokens: 12 },
              }),
              { status: 200 },
            );
          }
          throw new Error(`paid model should not be called: ${body.model}`);
        }
        throw new Error(url);
      }),
    );
    await getCatalog({ force: true });
    const result = await chatCompletion({
      purpose: "phrase",
      maxTokens: 40,
      messages: [{ role: "user", content: "hi" }],
    });
    expect(result?.text).toBe("Short line.");
    expect(calls).toEqual(["openrouter/free", "vendor/ok:free"]);
    expect(calls).not.toContain("paid/model");
  });

  it("stops on account-wide quota without rotating models endlessly", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    vi.stubEnv("OPENROUTER_FREE_ONLY", "true");
    vi.stubEnv("OPENROUTER_PRIMARY_MODEL", "openrouter/free");
    vi.stubEnv("OPENROUTER_FALLBACK_MODELS", "vendor/ok:free");
    vi.stubEnv("OPENROUTER_MAX_ATTEMPTS", "3");
    let chatCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/models")) {
          return new Response(
            JSON.stringify({
              data: [
                { id: "openrouter/free", pricing: { prompt: "0", completion: "0" }, architecture: { output_modalities: ["text"] } },
                { id: "vendor/ok:free", pricing: { prompt: "0", completion: "0" }, architecture: { output_modalities: ["text"] } },
              ],
            }),
            { status: 200 },
          );
        }
        chatCalls += 1;
        return new Response(
          JSON.stringify({
            error: {
              code: 429,
              message: "Rate limit exceeded",
              metadata: { error_type: "rate_limit_exceeded" },
            },
          }),
          { status: 429 },
        );
      }),
    );
    await getCatalog({ force: true });
    const result = await chatCompletion({
      purpose: "phrase",
      maxTokens: 20,
      messages: [{ role: "user", content: "hi" }],
    });
    expect(result).toBeNull();
    expect(chatCalls).toBe(1);
  });

  it("returns null when API key is missing", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("AI_API_KEY", "");
    vi.stubEnv("OPENROUTER_FREE_ONLY", "true");
    const result = await chatCompletion({
      purpose: "phrase",
      maxTokens: 20,
      messages: [{ role: "user", content: "hi" }],
    });
    expect(result).toBeNull();
  });
});
