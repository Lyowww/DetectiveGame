CREATE TABLE "telegram_identity" (
	"user_id" text PRIMARY KEY NOT NULL,
	"telegram_user_id" text NOT NULL,
	"chat_id" text,
	"notify" boolean DEFAULT false NOT NULL,
	"linked_at" timestamp NOT NULL,
	CONSTRAINT "telegram_identity_telegram_user_id_unique" UNIQUE("telegram_user_id")
);
--> statement-breakpoint
CREATE TABLE "bot_update" (
	"update_id" text PRIMARY KEY NOT NULL,
	"received_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_code" (
	"user_id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	CONSTRAINT "referral_code_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "referral_use" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"referred_user_id" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "telegram_identity" ADD CONSTRAINT "telegram_identity_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_code" ADD CONSTRAINT "referral_code_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_use" ADD CONSTRAINT "referral_use_referred_user_id_user_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "referral_use_once" ON "referral_use" USING btree ("code","referred_user_id");
