import "server-only";
import { makeSignature } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { authSecret } from "@/server/auth";
import { ensureDb } from "@/server/db";
import * as tables from "@/server/db/schema";

const WEEK = 7 * 24 * 60 * 60;

export function sessionCookieName() {
  const url = process.env.BETTER_AUTH_URL ?? "";
  const secure = url.startsWith("https://") || process.env.NODE_ENV === "production";
  return `${secure ? "__Secure-" : ""}better-auth.session_token`;
}

export async function issueSession(userId: string) {
  const database = await ensureDb();
  const token = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
  const now = new Date();
  await database.insert(tables.session).values({
    id: crypto.randomUUID(),
    token,
    userId,
    expiresAt: new Date(now.getTime() + WEEK * 1000),
    createdAt: now,
    updatedAt: now,
  });
  const signature = await makeSignature(token, authSecret());
  return { name: sessionCookieName(), value: `${token}.${signature}`, maxAge: WEEK };
}

export async function clearSessions(userId: string) {
  const database = await ensureDb();
  await database.delete(tables.session).where(eq(tables.session.userId, userId));
}
