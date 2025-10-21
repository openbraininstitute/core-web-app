CREATE TYPE "public"."auth_token_status" AS ENUM('pending', 'active', 'failed', 'undefined');--> statement-breakpoint
CREATE TYPE "public"."auth_token_type" AS ENUM('offline', 'refresh');--> statement-breakpoint
CREATE TABLE "auth_vault" (
	"id" uuid PRIMARY KEY DEFAULT 'b523167e-8d92-4f07-97b7-d3f82e25f83a' NOT NULL,
	"user_id" uuid NOT NULL,
	"token_type" "auth_token_type" NOT NULL,
	"encrypted_token" text,
	"iv" text,
	"token_hash" text,
	"metadata" jsonb,
	"status" "auth_token_status",
	"session_state" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "auth_vault_user_id_token_type_idx" ON "auth_vault" USING btree ("user_id","token_type" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "auth_vault_session_state_idx" ON "auth_vault" USING btree ("session_state");--> statement-breakpoint
CREATE INDEX "auth_vault_token_hash_idx" ON "auth_vault" USING btree ("token_hash");