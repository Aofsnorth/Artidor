CREATE TABLE "shares" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"payload" text NOT NULL,
	"password_hash" text,
	"manage_token_hash" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shares" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email_verified" SET DEFAULT false;