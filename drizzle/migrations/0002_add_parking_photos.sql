CREATE TABLE "parking_photos" (
	"id" text PRIMARY KEY NOT NULL,
	"parkingId" text NOT NULL,
	"url" text NOT NULL,
	"awardedPoints" integer DEFAULT 0 NOT NULL,
	"addedById" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parking_photos_parkingId_url_key" UNIQUE("parkingId","url")
);
--> statement-breakpoint
ALTER TABLE "parking_photos" ADD CONSTRAINT "parking_photos_parkingId_parkings_id_fk" FOREIGN KEY ("parkingId") REFERENCES "public"."parkings"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "parking_photos" ADD CONSTRAINT "parking_photos_addedById_users_id_fk" FOREIGN KEY ("addedById") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "parking_photos_parkingId_idx" ON "parking_photos" USING btree ("parkingId");--> statement-breakpoint
-- Photos already on parkings: credited to the parking's author, dated like the parking, no points
-- (posting photos with a new parking is part of its 20 points).
INSERT INTO "parking_photos" ("id", "parkingId", "url", "addedById", "createdAt")
SELECT gen_random_uuid()::text, p."id", photo.url, p."addedById", p."createdAt"
FROM "parkings" p
CROSS JOIN LATERAL unnest(p."photos") AS photo(url)
WHERE p."photos" IS NOT NULL
ON CONFLICT ("parkingId", "url") DO NOTHING;
