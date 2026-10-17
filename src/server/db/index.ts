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
  ready?: Promise<void>;
  driver?: "postgres" | "pglite";
};

function folder() {
  return path.join(process.cwd(), "drizzle");
}

function build(): AppDatabase {
  if (process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
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

export async function ensureDb() {
  getDb();
  if (!globalForDb.ready) {
    globalForDb.ready = (async () => {
      if (globalForDb.driver === "postgres") await migratePg(db as NodePgDatabase<typeof schema>, { migrationsFolder: folder() });
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
