import "server-only";

function envBool(name: string, fallback: boolean) {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  return !["0", "false", "off", "no"].includes(raw.toLowerCase());
}

function envInt(name: string, fallback: number) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function envList(name: string) {
  return (process.env[name] ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function openRouterConfig() {
  const freeOnly = envBool("OPENROUTER_FREE_ONLY", true);
  const apiKey = (process.env.OPENROUTER_API_KEY || "").trim();
  const legacyKey = (process.env.AI_API_KEY || "").trim();
  const legacyBase = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const openRouterBase = (process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/$/, "");
  const usingOpenRouter = Boolean(apiKey) || (Boolean(legacyKey) && /openrouter\.ai/i.test(legacyBase));
  const key = apiKey || (usingOpenRouter ? legacyKey : "");
  return {
    freeOnly,
    apiKey: key,
    baseUrl: apiKey ? openRouterBase : usingOpenRouter ? legacyBase : openRouterBase,
    primaryModel: (process.env.OPENROUTER_PRIMARY_MODEL || "openrouter/free").trim(),
    fallbackModels: envList("OPENROUTER_FALLBACK_MODELS"),
    catalogTtlMs: envInt("OPENROUTER_CATALOG_TTL_MS", 60 * 60 * 1000),
    catalogMaxStaleMs: envInt("OPENROUTER_CATALOG_MAX_STALE_MS", 6 * 60 * 60 * 1000),
    timeoutMs: envInt("OPENROUTER_TIMEOUT_MS", envInt("AI_TIMEOUT_MS", 20000)),
    maxAttempts: Math.min(4, Math.max(1, envInt("OPENROUTER_MAX_ATTEMPTS", 3))),
    appDailyRequests: envInt("OPENROUTER_APP_DAILY_REQUESTS", 400),
    userDailyRequests: envInt("OPENROUTER_USER_DAILY_REQUESTS", 40),
    tokenBudget: envInt("AI_DAILY_TOKEN_BUDGET", 40000),
    adminToken: (process.env.OPENROUTER_ADMIN_TOKEN || "").trim(),
    siteUrl: (process.env.APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000").replace(/\/$/, ""),
    appTitle: "CASEFILE",
    /** Legacy non-OpenRouter path only when free-only is disabled. */
    legacy: {
      enabled: !freeOnly && Boolean(legacyKey) && !usingOpenRouter,
      apiKey: legacyKey,
      baseUrl: legacyBase,
      model: (process.env.AI_MODEL || "gpt-4.1-mini").trim(),
    },
    usingOpenRouter: Boolean(key),
  };
}

export function aiLiveConfigured() {
  const cfg = openRouterConfig();
  if (cfg.usingOpenRouter) return Boolean(cfg.apiKey);
  return cfg.legacy.enabled;
}
