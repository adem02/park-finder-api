CREATE TYPE "public"."Provider" AS ENUM('local', 'google', 'apple');--> statement-breakpoint
CREATE TYPE "public"."VoteType" AS ENUM('UPVOTE', 'DOWNVOTE');--> statement-breakpoint
CREATE TABLE "availability_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"parkingId" text NOT NULL,
	"reportedById" text NOT NULL,
	"availableSpots" integer NOT NULL,
	"reportedAt" timestamp with time zone NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"expired" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"iconUrl" text NOT NULL,
	"criteriaType" text NOT NULL,
	"criteriaThreshold" integer NOT NULL,
	CONSTRAINT "badges_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" text PRIMARY KEY NOT NULL,
	"content" varchar(500) NOT NULL,
	"parkingId" text NOT NULL,
	"authorId" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "monthly_leaderboard" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"month" text NOT NULL,
	"monthlyPoints" integer DEFAULT 0 NOT NULL,
	"rank" integer NOT NULL,
	CONSTRAINT "monthly_leaderboard_userId_month_key" UNIQUE("userId","month")
);
--> statement-breakpoint
CREATE TABLE "parkings" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"totalSpots" integer NOT NULL,
	"photos" text[],
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"location" geography(Point, 4326),
	"addedById" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"badgeId" text NOT NULL,
	"earnedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_badges_userId_badgeId_key" UNIQUE("userId","badgeId")
);
--> statement-breakpoint
CREATE TABLE "user_credentials" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"provider" "Provider" NOT NULL,
	"providerId" text,
	"passwordHash" text,
	"firstName" text,
	"lastName" text,
	"photoUrl" text,
	CONSTRAINT "user_credentials_userId_unique" UNIQUE("userId"),
	CONSTRAINT "user_credentials_provider_providerId_key" UNIQUE("provider","providerId")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"email" text,
	"photoUrl" text,
	"points" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" text PRIMARY KEY NOT NULL,
	"parkingId" text NOT NULL,
	"votedById" text NOT NULL,
	"voteType" "VoteType" NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone,
	CONSTRAINT "votes_parkingId_votedById_key" UNIQUE("parkingId","votedById")
);
--> statement-breakpoint
ALTER TABLE "availability_reports" ADD CONSTRAINT "availability_reports_parkingId_parkings_id_fk" FOREIGN KEY ("parkingId") REFERENCES "public"."parkings"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "availability_reports" ADD CONSTRAINT "availability_reports_reportedById_users_id_fk" FOREIGN KEY ("reportedById") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parkingId_parkings_id_fk" FOREIGN KEY ("parkingId") REFERENCES "public"."parkings"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_authorId_users_id_fk" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "monthly_leaderboard" ADD CONSTRAINT "monthly_leaderboard_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "parkings" ADD CONSTRAINT "parkings_addedById_users_id_fk" FOREIGN KEY ("addedById") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badgeId_badges_id_fk" FOREIGN KEY ("badgeId") REFERENCES "public"."badges"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_credentials" ADD CONSTRAINT "user_credentials_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_parkingId_parkings_id_fk" FOREIGN KEY ("parkingId") REFERENCES "public"."parkings"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_votedById_users_id_fk" FOREIGN KEY ("votedById") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "availability_reports_parkingId_reportedAt_idx" ON "availability_reports" USING btree ("parkingId","reportedAt" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "availability_reports_expiresAt_idx" ON "availability_reports" USING btree ("expiresAt");--> statement-breakpoint
CREATE INDEX "comments_parkingId_createdAt_idx" ON "comments" USING btree ("parkingId","createdAt" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "monthly_leaderboard_month_monthlyPoints_idx" ON "monthly_leaderboard" USING btree ("month","monthlyPoints" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "parkings_location_idx" ON "parkings" USING gist ("location");