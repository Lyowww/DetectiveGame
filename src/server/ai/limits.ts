import "server-only";
import fs from "fs";
import path from "path";
import { openRouterConfig } from "@/server/ai/config";

interface DayBucket {
  day: string;
  appRequests: number;
  appTokens: number;
  users: Record<string, { requests: number; tokens: number }>;
}

interface CircuitState {
  failures: number;
  openUntil: number;
  lastError: string | null;
}

const storePath = () => path.join(process.cwd(), ".data", "ai-usage.json");

let circuit: CircuitState = { failures: 0, openUntil: 0, lastError: null };
let memory: DayBucket = { day: utcDay(), appRequests: 0, appTokens: 0, users: {} };

function utcDay() {
  return new Date().toISOString().slice(0, 10);
}

function load() {
  try {
    const raw = fs.readFileSync(storePath(), "utf8");
    const parsed = JSON.parse(raw) as DayBucket;
    if (parsed.day === utcDay()) memory = parsed;
    else memory = { day: utcDay(), appRequests: 0, appTokens: 0, users: {} };
  } catch {
    memory = { day: utcDay(), appRequests: 0, appTokens: 0, users: {} };
  }
}

function save() {
  try {
    fs.mkdirSync(path.dirname(storePath()), { recursive: true });
    fs.writeFileSync(storePath(), JSON.stringify(memory), { mode: 0o600 });
  } catch {
    // Best-effort persistence; in-memory still enforces for this process.
  }
}

function ensureDay() {
  const day = utcDay();
  if (memory.day !== day) {
    memory = { day, appRequests: 0, appTokens: 0, users: {} };
  }
}

load();

export function circuitOpen() {
  return Date.now() < circuit.openUntil;
}

export function circuitStatus() {
  return { ...circuit, open: circuitOpen() };
}

export function recordProviderSuccess() {
  circuit = { failures: 0, openUntil: 0, lastError: null };
}

export function recordProviderFailure(message: string, accountWide = false) {
  circuit.failures += 1;
  circuit.lastError = message.slice(0, 200);
  if (accountWide || circuit.failures >= 5) {
    circuit.openUntil = Date.now() + (accountWide ? 15 * 60_000 : 60_000);
  }
}

export function usageSnapshot() {
  ensureDay();
  return {
    day: memory.day,
    appRequests: memory.appRequests,
    appTokens: memory.appTokens,
    userCount: Object.keys(memory.users).length,
    circuit: circuitStatus(),
  };
}

export function withinBudget(usedTokens: number) {
  const cfg = openRouterConfig();
  return usedTokens < cfg.tokenBudget;
}

export function canSpend(userId: string | null): { ok: true } | { ok: false; reason: string } {
  const cfg = openRouterConfig();
  ensureDay();
  if (circuitOpen()) return { ok: false, reason: "circuit-open" };
  if (memory.appRequests >= cfg.appDailyRequests) return { ok: false, reason: "app-daily-limit" };
  if (userId) {
    const user = memory.users[userId] ?? { requests: 0, tokens: 0 };
    if (user.requests >= cfg.userDailyRequests) return { ok: false, reason: "user-daily-limit" };
  }
  return { ok: true };
}

export function recordSpend(userId: string | null, tokens: number) {
  ensureDay();
  memory.appRequests += 1;
  memory.appTokens += Math.max(0, tokens);
  if (userId) {
    const user = memory.users[userId] ?? { requests: 0, tokens: 0 };
    user.requests += 1;
    user.tokens += Math.max(0, tokens);
    memory.users[userId] = user;
  }
  save();
}

export function __resetLimitsForTests() {
  memory = { day: utcDay(), appRequests: 0, appTokens: 0, users: {} };
  circuit = { failures: 0, openUntil: 0, lastError: null };
}
