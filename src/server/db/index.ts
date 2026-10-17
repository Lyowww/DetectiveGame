import fs from "fs";
import os from "os";
import path from "path";
import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { Pool } from "pg";
import * as schema from "@/server/db/schema";

export type AppDatabase = PgliteDatabase<typeof schema> | NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  db?: AppDatabase;
  pool?: Pool;
  ready?: Promise<void>;
  driver?: "postgres" | "pglite";
};

function folder() {
  return path.join(process.cwd(), "drizzle");
}

function withSslCompat(url: string) {
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("sslmode")) parsed.searchParams.set("sslmode", "require");
    if (!parsed.searchParams.has("uselibpqcompat")) parsed.searchParams.set("uselibpqcompat", "true");
    return parsed.toString();
  } catch {
    return url;
  }
}

function postgresUrl(preferDirect = false) {
  const direct = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || "";
  const pooled = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
  const chosen = preferDirect ? direct || pooled : pooled || direct;
  return chosen ? withSslCompat(chosen) : "";
}

function buildPool(connectionString: string) {
  const serverless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const pool = new Pool({
    connectionString,
    max: serverless ? 1 : 10,
    idleTimeoutMillis: serverless ? 5_000 : 30_000,
    connectionTimeoutMillis: 15_000,
    ssl: connectionString.includes("sslmode=disable") ? undefined : { rejectUnauthorized: false },
  });
  if (serverless) {
    void import("@vercel/functions")
      .then(({ attachDatabasePool }) => attachDatabasePool(pool))
      .catch(() => undefined);
  }
  return pool;
}

function build(): AppDatabase {
  const connectionString = postgresUrl(false);
  if (connectionString) {
    const pool = buildPool(connectionString);
    globalForDb.pool = pool;
    globalForDb.driver = "postgres";
    return drizzlePg(pool, { schema });
  }
  const memory = process.env.CASEFILE_DB === "memory";
  const building = process.env.NEXT_PHASE === "phase-production-build";
  const dataDir = memory ? undefined : path.join(building ? os.tmpdir() : process.cwd(), building ? "casefile-build-pglite" : ".data/pglite");
  if (dataDir) fs.mkdirSync(dataDir, { recursive: true });
  globalForDb.driver = "pglite";
  return drizzlePglite(new PGlite(dataDir), { schema });
}

function getDb(): AppDatabase {
  if (!globalForDb.db) globalForDb.db = build();
  return globalForDb.db;
}

export const db: AppDatabase = new Proxy({} as AppDatabase, {
  get(_target, property) {
    const current = getDb();
    const value = current[property as keyof AppDatabase];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(current) : value;
  },
});

export function databaseDriver() {
  return globalForDb.driver ?? "pglite";
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function migratePostgresWithRetry() {
  const direct = postgresUrl(true);
  let lastError: unknown;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const pool = buildPool(direct);
    try {
      const migrator = drizzlePg(pool, { schema });
      await migratePg(migrator, { migrationsFolder: folder() });
      await pool.end().catch(() => undefined);
      return;
    } catch (error) {
      lastError = error;
      await pool.end().catch(() => undefined);
      await sleep(250 * attempt * attempt);
    }
  }
  throw lastError;
}

export async function ensureDb() {
  getDb();
  if (!globalForDb.ready) {
    globalForDb.ready = (async () => {
      if (globalForDb.driver === "postgres") await migratePostgresWithRetry();
      else await migratePglite(db as PgliteDatabase<typeof schema>, { migrationsFolder: folder() });
    })().catch((error) => {
      globalForDb.ready = undefined;
      throw error;
    });
  }
  await globalForDb.ready;
  return db;
}

export async function migrateUserData(fromUserId: string, toUserId: string) {
  await ensureDb();
  await db.transaction(async (tx) => {
    await tx.update(schema.run).set({ userId: toUserId }).where(eq(schema.run.userId, fromUserId));
    await tx.update(schema.note).set({ userId: toUserId }).where(eq(schema.note.userId, fromUserId));
    await tx.update(schema.submission).set({ userId: toUserId }).where(eq(schema.submission.userId, fromUserId));
    await tx.update(schema.scoreEvent).set({ userId: toUserId }).where(eq(schema.scoreEvent.userId, fromUserId));
    await tx.update(schema.achievement).set({ userId: toUserId }).where(eq(schema.achievement.userId, fromUserId));
    const existing = await tx.select().from(schema.profile).where(eq(schema.profile.userId, toUserId));
    if (!existing.length) {
      const old = await tx.select().from(schema.profile).where(eq(schema.profile.userId, fromUserId));
      if (old[0]) await tx.insert(schema.profile).values({ ...old[0], userId: toUserId });
    }
  });
}
