export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  try {
    const { ensureDb } = await import("@/server/db");
    await ensureDb();
  } catch (error) {
    // Never crash the whole app on a cold DB warm-up — routes that need the DB will retry.
    console.error("[casefile] database warm-up failed", error instanceof Error ? error.message : error);
  }
}
