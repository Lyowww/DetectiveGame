import "server-only";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { and, desc, eq } from "drizzle-orm";
import { ensureDb, migrateUserData } from "@/server/db";
import * as tables from "@/server/db/schema";
import { ensureProfile, listRuns } from "@/server/game";
import { parseLaunch, routeFor, type Launch } from "@/server/telegram/launch";

const SYNTHETIC = "@identity.casefile.invalid";

export function syntheticEmail(telegramUserId: string) {
  return `tg.${telegramUserId}${SYNTHETIC}`;
}

export function isSyntheticEmail(email: string) {
  return email.endsWith(SYNTHETIC);
}

async function userByTelegram(telegramUserId: string) {
  const database = await ensureDb();
  const rows = await database.select().from(tables.telegramIdentity).where(eq(tables.telegramIdentity.telegramUserId, telegramUserId));
  return rows[0] ?? null;
}

export async function establishTelegramUser(telegramUserId: string) {
  const database = await ensureDb();
  const existing = await userByTelegram(telegramUserId);
  if (existing) {
    await ensureProfile(existing.userId, "Detective");
    return existing.userId;
  }
  const now = new Date();
  const userId = crypto.randomUUID();
  await database.insert(tables.user).values({
    id: userId,
    name: "Detective",
    email: syntheticEmail(telegramUserId),
    emailVerified: false,
    createdAt: now,
    updatedAt: now,
    isAnonymous: false,
  });
  await database.insert(tables.telegramIdentity).values({
    userId,
    telegramUserId,
    chatId: null,
    notify: false,
    linkedAt: now,
  });
  await database.insert(tables.account).values({
    id: crypto.randomUUID(),
    accountId: telegramUserId,
    providerId: "telegram",
    userId,
    createdAt: now,
    updatedAt: now,
  });
  await ensureProfile(userId, "Detective");
  return userId;
}

export async function destinationFor(userId: string, startParam: string | null) {
  const launch = parseLaunch(startParam);
  const runs = await listRuns(userId);
  const active = runs.find((run) => run.status === "active");
  const route = routeFor(launch.kind === "referral" || launch.kind === "link" ? { kind: "home" } : launch, active?.id ?? null);
  return { launch, ...route };
}

export async function rememberChat(telegramUserId: string, chatId: string) {
  const database = await ensureDb();
  await database.update(tables.telegramIdentity).set({ chatId }).where(eq(tables.telegramIdentity.telegramUserId, telegramUserId));
}

export async function setNotify(userId: string, notify: boolean) {
  const database = await ensureDb();
  await database.update(tables.telegramIdentity).set({ notify }).where(eq(tables.telegramIdentity.userId, userId));
}

export async function identityForUser(userId: string) {
  const database = await ensureDb();
  const rows = await database.select().from(tables.telegramIdentity).where(eq(tables.telegramIdentity.userId, userId));
  return rows[0] ?? null;
}

export async function identityByTelegram(telegramUserId: string) {
  return userByTelegram(telegramUserId);
}

async function consumeVerification(identifier: string) {
  const database = await ensureDb();
  const rows = await database.select().from(tables.verification).where(eq(tables.verification.identifier, identifier));
  const row = rows[0];
  if (!row || row.expiresAt.getTime() < Date.now()) return null;
  await database.delete(tables.verification).where(eq(tables.verification.id, row.id));
  return row.value;
}

export async function createOneTimeCode(prefix: string, value: string) {
  const database = await ensureDb();
  const code = crypto.randomUUID().replaceAll("-", "").slice(0, 10);
  const now = new Date();
  await database.insert(tables.verification).values({
    id: crypto.randomUUID(),
    identifier: `${prefix}:${code}`,
    value,
    expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
    createdAt: now,
    updatedAt: now,
  });
  return code;
}

export async function redeemContinueCode(code: string) {
  if (!/^[a-f0-9]{10}$/.test(code)) return null;
  return consumeVerification(`continue:${code}`);
}

export async function linkTelegramToUser(telegramUserId: string, targetUserId: string) {
  const database = await ensureDb();
  const current = await userByTelegram(telegramUserId);
  if (current?.userId === targetUserId) return { ok: true as const, userId: targetUserId };
  if (current && current.userId !== targetUserId) {
    const owner = await database.select().from(tables.user).where(eq(tables.user.id, current.userId));
    const synthetic = owner[0] ? isSyntheticEmail(owner[0].email) : false;
    if (!synthetic) return { ok: false as const, reason: "conflict" as const };
    await migrateUserData(current.userId, targetUserId);
    await database.delete(tables.account).where(and(eq(tables.account.providerId, "telegram"), eq(tables.account.userId, current.userId)));
    await database.delete(tables.telegramIdentity).where(eq(tables.telegramIdentity.userId, current.userId));
    await database.delete(tables.user).where(eq(tables.user.id, current.userId));
  }
  const now = new Date();
  await database.insert(tables.telegramIdentity).values({
    userId: targetUserId,
    telegramUserId,
    chatId: current?.chatId ?? null,
    notify: current?.notify ?? false,
    linkedAt: now,
  });
  await database.insert(tables.account).values({
    id: crypto.randomUUID(),
    accountId: telegramUserId,
    providerId: "telegram",
    userId: targetUserId,
    createdAt: now,
    updatedAt: now,
  });
  return { ok: true as const, userId: targetUserId };
}

export async function redeemLinkCode(code: string, telegramUserId: string) {
  if (!/^[a-f0-9]{10}$/.test(code)) return { ok: false as const, reason: "invalid" as const };
  const targetUserId = await consumeVerification(`link:${code}`);
  if (!targetUserId) return { ok: false as const, reason: "invalid" as const };
  return linkTelegramToUser(telegramUserId, targetUserId);
}

export async function linkEmail(userId: string, email: string, password: string, name: string) {
  const database = await ensureDb();
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+$/.test(normalized) || password.length < 8) return { ok: false as const, reason: "invalid" as const };
  const owners = await database.select().from(tables.user).where(eq(tables.user.email, normalized));
  const owner = owners[0];
  if (!owner) {
    const now = new Date();
    await database.update(tables.user).set({ email: normalized, name: name || "Detective", updatedAt: now }).where(eq(tables.user.id, userId));
    await database.insert(tables.account).values({
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: await hashPassword(password),
      createdAt: now,
      updatedAt: now,
    });
    if (name) await database.update(tables.profile).set({ displayName: name }).where(eq(tables.profile.userId, userId));
    return { ok: true as const, userId };
  }
  if (owner.id === userId) return { ok: true as const, userId };
  const credentials = await database
    .select()
    .from(tables.account)
    .where(and(eq(tables.account.userId, owner.id), eq(tables.account.providerId, "credential"), eq(tables.account.accountId, owner.id)));
  const credential = credentials[0];
  if (!credential?.password || !(await verifyPassword({ hash: credential.password, password }))) {
    return { ok: false as const, reason: "invalid" as const };
  }
  const mine = await identityForUser(userId);
  if (!mine) return { ok: false as const, reason: "invalid" as const };
  const linked = await linkTelegramToUser(mine.telegramUserId, owner.id);
  if (!linked.ok) return linked;
  return { ok: true as const, userId: owner.id };
}

export async function attributeReferral(userId: string, launch: Launch) {
  if (launch.kind !== "referral") return;
  const database = await ensureDb();
  const codes = await database.select().from(tables.referralCode).where(eq(tables.referralCode.code, launch.code));
  const code = codes[0];
  if (!code || code.userId === userId) return;
  await database
    .insert(tables.referralUse)
    .values({ id: crypto.randomUUID(), code: launch.code, referredUserId: userId, createdAt: new Date() })
    .onConflictDoNothing();
}

export async function ensureReferralCode(userId: string) {
  const database = await ensureDb();
  const existing = await database.select().from(tables.referralCode).where(eq(tables.referralCode.userId, userId));
  if (existing[0]) return existing[0].code;
  const code = crypto.randomUUID().replaceAll("-", "").slice(0, 8);
  await database.insert(tables.referralCode).values({ userId, code });
  return code;
}

export async function deleteAccount(userId: string) {
  const database = await ensureDb();
  await database.delete(tables.user).where(eq(tables.user.id, userId));
}

export async function latestActiveRun(userId: string) {
  const database = await ensureDb();
  const rows = await database
    .select()
    .from(tables.run)
    .where(and(eq(tables.run.userId, userId), eq(tables.run.status, "active")))
    .orderBy(desc(tables.run.updatedAt));
  return rows[0] ?? null;
}
