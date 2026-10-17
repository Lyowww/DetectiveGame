import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import { ensureDb } from "@/server/db";
import { parseLaunch, routeFor } from "@/server/telegram/launch";
import { claimUpdate, webhookAuthorized } from "@/server/telegram/bot";
import { INIT_DATA_MAX_AGE_SECONDS, verifyInitData } from "@/server/telegram/verify";

const token = "123456:casefile-test-token";

function signed(fields: Record<string, string>, bot = token) {
  const params = new URLSearchParams(fields);
  const pairs = [...params.entries()].filter(([key]) => key !== "hash").map(([key, value]) => `${key}=${value}`).sort();
  const secret = createHmac("sha256", "WebAppData").update(bot).digest();
  const hash = createHmac("sha256", secret).update(pairs.join("\n")).digest("hex");
  params.set("hash", hash);
  return params.toString();
}

const user = JSON.stringify({ id: 4242, first_name: "Ada" });

describe("telegram initData", () => {
  it("accepts a current signature and rejects tampering, expiry, and junk", () => {
    const now = 1_700_000_000_000;
    const raw = signed({ auth_date: String(Math.floor(now / 1000)), user, start_param: "daily" });
    const ok = verifyInitData(raw, token, now);
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.data.telegramUserId).toBe("4242");
      expect(ok.data.startParam).toBe("daily");
    }
    const tampered = raw.replace("daily", "case");
    expect(verifyInitData(tampered, token, now).ok).toBe(false);
    expect(verifyInitData(raw, "other-token", now).ok).toBe(false);
    const stale = signed({ auth_date: String(Math.floor(now / 1000) - INIT_DATA_MAX_AGE_SECONDS - 5), user });
    expect(verifyInitData(stale, token, now)).toEqual({ ok: false, reason: "expired" });
    expect(verifyInitData("not-a-query", token, now).ok).toBe(false);
    expect(verifyInitData("", token, now).ok).toBe(false);
  });
});

describe("launch parameters", () => {
  it("routes known openings and refuses run identifiers", () => {
    expect(parseLaunch("case_tide-ledger")).toEqual({ kind: "case", caseId: "tide-ledger" });
    expect(parseLaunch("daily").kind).toBe("daily");
    expect(parseLaunch("ref_ab12cd34")).toEqual({ kind: "referral", code: "ab12cd34" });
    expect(parseLaunch("run_secret")).toEqual({ kind: "unavailable" });
    expect(parseLaunch("case_missing").kind).toBe("unavailable");
    expect(routeFor({ kind: "unavailable" }, "run-1").path).toBe("/library");
    expect(routeFor({ kind: "home" }, "run-1").path).toBe("/investigate/run-1");
    expect(routeFor({ kind: "case", caseId: "tide-ledger" }, "run-1").path).toBe("/briefing/tide-ledger");
  });
});

describe("webhook secret", () => {
  it("requires the configured header", () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "hook-secret";
    expect(webhookAuthorized("hook-secret")).toBe(true);
    expect(webhookAuthorized("hook-secreT")).toBe(false);
    expect(webhookAuthorized(null)).toBe(false);
  });

  it("records an update once", async () => {
    await ensureDb();
    expect(await claimUpdate(77001)).toBe(true);
    expect(await claimUpdate(77001)).toBe(false);
  });
});
