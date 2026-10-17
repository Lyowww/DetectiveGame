CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "achievement" (
	"user_id" text NOT NULL,
	"code" text NOT NULL,
	"earned_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "action_receipt" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"key" text NOT NULL,
	"response" jsonb NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "board_edge" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"source" text NOT NULL,
	"target" text NOT NULL,
	"label" text NOT NULL,
	"state" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "board_node" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"kind" text NOT NULL,
	"ref_id" text NOT NULL,
	"x" integer NOT NULL,
	"y" integer NOT NULL,
	"label" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contradiction" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"claim_a_id" text NOT NULL,
	"claim_b_id" text NOT NULL,
	"explanation" text NOT NULL,
	"state" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discovered_evidence" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"evidence_id" text NOT NULL,
	"discovered_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hint_use" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"level" integer NOT NULL,
	"in_world_minute" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview_message" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"character_id" text NOT NULL,
	"role" text NOT NULL,
	"body" text NOT NULL,
	"evidence_ids" jsonb NOT NULL,
	"in_world_minute" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "note" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"user_id" text NOT NULL,
	"body" text NOT NULL,
	"quote" text,
	"source_type" text NOT NULL,
	"source_id" text,
	"speaker" text,
	"mark" text NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"payload" jsonb NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_assertion" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"body" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"text_size" text DEFAULT 'md' NOT NULL,
	"contrast" text DEFAULT 'ink' NOT NULL,
	"reduced_motion" boolean DEFAULT false NOT NULL,
	"autoplay_voice" boolean DEFAULT false NOT NULL,
	"leaderboard" text DEFAULT 'private' NOT NULL,
	"ai_tokens" integer DEFAULT 0 NOT NULL,
	"ai_day" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "run" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"case_id" text NOT NULL,
	"case_version" text NOT NULL,
	"difficulty" text NOT NULL,
	"language" text NOT NULL,
	"mode" text NOT NULL,
	"status" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"attempt" integer NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "score_event" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"user_id" text NOT NULL,
	"code" text NOT NULL,
	"points" integer NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "submission" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"user_id" text NOT NULL,
	"case_id" text NOT NULL,
	"case_version" text NOT NULL,
	"difficulty" text NOT NULL,
	"score" integer NOT NULL,
	"grade" text NOT NULL,
	"first_attempt" boolean NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "submission_run_id_unique" UNIQUE("run_id")
);
--> statement-breakpoint
CREATE TABLE "timeline_event" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"title" text NOT NULL,
	"minute" integer,
	"payload" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"is_anonymous" boolean DEFAULT false,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievement" ADD CONSTRAINT "achievement_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_receipt" ADD CONSTRAINT "action_receipt_run_id_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_edge" ADD CONSTRAINT "board_edge_run_id_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_node" ADD CONSTRAINT "board_node_run_id_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contradiction" ADD CONSTRAINT "contradiction_run_id_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovered_evidence" ADD CONSTRAINT "discovered_evidence_run_id_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hint_use" ADD CONSTRAINT "hint_use_run_id_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_message" ADD CONSTRAINT "interview_message_run_id_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note" ADD CONSTRAINT "note_run_id_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note" ADD CONSTRAINT "note_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_assertion" ADD CONSTRAINT "player_assertion_run_id_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run" ADD CONSTRAINT "run_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_event" ADD CONSTRAINT "score_event_run_id_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_event" ADD CONSTRAINT "score_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission" ADD CONSTRAINT "submission_run_id_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission" ADD CONSTRAINT "submission_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_event" ADD CONSTRAINT "timeline_event_run_id_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "achievement_user_code" ON "achievement" USING btree ("user_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "action_receipt_run_key" ON "action_receipt" USING btree ("run_id","key");