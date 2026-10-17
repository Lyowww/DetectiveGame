import { boolean, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { RunState } from "@/lib/types";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  isAnonymous: boolean("is_anonymous").default(false),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const profile = pgTable("profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  locale: text("locale").notNull().default("en"),
  textSize: text("text_size").notNull().default("md"),
  contrast: text("contrast").notNull().default("ink"),
  reducedMotion: boolean("reduced_motion").notNull().default(false),
  autoplayVoice: boolean("autoplay_voice").notNull().default(false),
  leaderboard: text("leaderboard").notNull().default("private"),
  aiTokens: integer("ai_tokens").notNull().default(0),
  aiDay: text("ai_day").notNull().default(""),
});

export const telegramIdentity = pgTable("telegram_identity", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  telegramUserId: text("telegram_user_id").notNull().unique(),
  chatId: text("chat_id"),
  notify: boolean("notify").notNull().default(false),
  linkedAt: timestamp("linked_at").notNull(),
});

export const botUpdate = pgTable("bot_update", {
  updateId: text("update_id").primaryKey(),
  receivedAt: timestamp("received_at").notNull(),
});

export const referralCode = pgTable("referral_code", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(),
});

export const referralUse = pgTable(
  "referral_use",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    referredUserId: text("referred_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [uniqueIndex("referral_use_once").on(table.code, table.referredUserId)],
);

export const run = pgTable("run", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  caseId: text("case_id").notNull(),
  caseVersion: text("case_version").notNull(),
  difficulty: text("difficulty").notNull(),
  language: text("language").notNull(),
  mode: text("mode").notNull(),
  status: text("status").notNull(),
  snapshot: jsonb("snapshot").$type<RunState>().notNull(),
  attempt: integer("attempt").notNull(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  completedAt: timestamp("completed_at"),
});

export const actionReceipt = pgTable(
  "action_receipt",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => run.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    response: jsonb("response").notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [uniqueIndex("action_receipt_run_key").on(table.runId, table.key)],
);

export const discoveredEvidence = pgTable("discovered_evidence", {
  id: text("id").primaryKey(),
  runId: text("run_id")
    .notNull()
    .references(() => run.id, { onDelete: "cascade" }),
  evidenceId: text("evidence_id").notNull(),
  discoveredAt: timestamp("discovered_at").notNull(),
});

export const interviewMessage = pgTable("interview_message", {
  id: text("id").primaryKey(),
  runId: text("run_id")
    .notNull()
    .references(() => run.id, { onDelete: "cascade" }),
  characterId: text("character_id").notNull(),
  role: text("role").notNull(),
  body: text("body").notNull(),
  evidenceIds: jsonb("evidence_ids").$type<string[]>().notNull(),
  inWorldMinute: integer("in_world_minute").notNull(),
});

export const note = pgTable("note", {
  id: text("id").primaryKey(),
  runId: text("run_id")
    .notNull()
    .references(() => run.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  quote: text("quote"),
  sourceType: text("source_type").notNull(),
  sourceId: text("source_id"),
  speaker: text("speaker"),
  mark: text("mark").notNull(),
  pinned: boolean("pinned").notNull().default(false),
  payload: jsonb("payload").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const boardNode = pgTable("board_node", {
  id: text("id").primaryKey(),
  runId: text("run_id")
    .notNull()
    .references(() => run.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  refId: text("ref_id").notNull(),
  x: integer("x").notNull(),
  y: integer("y").notNull(),
  label: text("label").notNull(),
});

export const boardEdge = pgTable("board_edge", {
  id: text("id").primaryKey(),
  runId: text("run_id")
    .notNull()
    .references(() => run.id, { onDelete: "cascade" }),
  source: text("source").notNull(),
  target: text("target").notNull(),
  label: text("label").notNull(),
  state: text("state").notNull(),
});

export const contradiction = pgTable("contradiction", {
  id: text("id").primaryKey(),
  runId: text("run_id")
    .notNull()
    .references(() => run.id, { onDelete: "cascade" }),
  claimAId: text("claim_a_id").notNull(),
  claimBId: text("claim_b_id").notNull(),
  explanation: text("explanation").notNull(),
  state: text("state").notNull(),
});

export const timelineEvent = pgTable("timeline_event", {
  id: text("id").primaryKey(),
  runId: text("run_id")
    .notNull()
    .references(() => run.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  minute: integer("minute"),
  payload: jsonb("payload").notNull(),
});

export const hintUse = pgTable("hint_use", {
  id: text("id").primaryKey(),
  runId: text("run_id")
    .notNull()
    .references(() => run.id, { onDelete: "cascade" }),
  level: integer("level").notNull(),
  inWorldMinute: integer("in_world_minute").notNull(),
});

export const playerAssertion = pgTable("player_assertion", {
  id: text("id").primaryKey(),
  runId: text("run_id")
    .notNull()
    .references(() => run.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  verified: boolean("verified").notNull().default(false),
});

export const submission = pgTable("submission", {
  id: text("id").primaryKey(),
  runId: text("run_id")
    .notNull()
    .unique()
    .references(() => run.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  caseId: text("case_id").notNull(),
  caseVersion: text("case_version").notNull(),
  difficulty: text("difficulty").notNull(),
  score: integer("score").notNull(),
  grade: text("grade").notNull(),
  firstAttempt: boolean("first_attempt").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at").notNull(),
});

export const scoreEvent = pgTable("score_event", {
  id: text("id").primaryKey(),
  runId: text("run_id")
    .notNull()
    .references(() => run.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  points: integer("points").notNull(),
  createdAt: timestamp("created_at").notNull(),
});

export const achievement = pgTable(
  "achievement",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    earnedAt: timestamp("earned_at").notNull(),
  },
  (table) => [uniqueIndex("achievement_user_code").on(table.userId, table.code)],
);

export const authSchema = { user, session, account, verification };
