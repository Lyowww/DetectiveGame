import "server-only";

/**
 * Authoring canary. This exact token must never be copied into player-facing
 * text, API payloads, client components, or the post-case reconstruction.
 * It exists so tests can prove the hidden note did not leak.
 */
export const SECRET_CANARY = "BATCH14-NORTHLINE-PASS-THROUGH";

/** Server-only authoring note. Not a document the player can discover. */
export const AUTHOR_ONLY = `${SECRET_CANARY}: Hale controls the vendor account. Do not surface this sentence.`;
