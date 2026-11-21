CREATE TYPE "public"."RefreshTokenRevocation" AS ENUM('rotated', 'logout', 'reuse');--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"familyId" text NOT NULL,
	"tokenHash" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"revokedAt" timestamp with time zone,
	"revokedReason" "RefreshTokenRevocation",
	CONSTRAINT "refresh_tokens_tokenHash_unique" UNIQUE("tokenHash")
);
--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "refresh_tokens_familyId_idx" ON "refresh_tokens" USING btree ("familyId");