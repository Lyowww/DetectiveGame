import { createHmac, timingSafeEqual } from "crypto";

/** Official Mini App guidance allows an auth_date check. CASEFILE rejects initData older than 24 hours. */
export const INIT_DATA_MAX_AGE_SECONDS = 86_400;

export interface VerifiedInit {
  telegramUserId: string;
  startParam: string | null;
  authDate: number;
}

export type VerifyResult = { ok: true; data: VerifiedInit } | { ok: false; reason: "malformed" | "invalid" | "expired" };

export function verifyInitData(initData: string, botToken: string, now = Date.now()): VerifyResult {
  if (!botToken || typeof initData !== "string" || initData.length < 16 || initData.length > 4096) {
    return { ok: false, reason: "malformed" };
  }
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return { ok: false, reason: "malformed" };
  }
  const hash = params.get("hash");
  if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) return { ok: false, reason: "malformed" };
  const authDate = Number(params.get("auth_date"));
  if (!Number.isInteger(authDate) || authDate <= 0) return { ok: false, reason: "malformed" };
  const age = now / 1000 - authDate;
  if (age > INIT_DATA_MAX_AGE_SECONDS || age < -60) return { ok: false, reason: "expired" };

  const pairs: string[] = [];
  for (const [key, value] of params.entries()) {
    if (key === "hash") continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculated = createHmac("sha256", secret).update(pairs.join("\n")).digest("hex");
  const left = Buffer.from(calculated, "hex");
  const right = Buffer.from(hash, "hex");
  if (left.length !== right.length || !timingSafeEqual(left, right)) return { ok: false, reason: "invalid" };

  let user: { id?: unknown };
  try {
    user = JSON.parse(params.get("user") ?? "") as { id?: unknown };
  } catch {
    return { ok: false, reason: "malformed" };
  }
  const telegramUserId = typeof user.id === "number" || typeof user.id === "string" ? String(user.id) : "";
  if (!/^\d{1,20}$/.test(telegramUserId)) return { ok: false, reason: "malformed" };
  return { ok: true, data: { telegramUserId, startParam: params.get("start_param"), authDate } };
}
