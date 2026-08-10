ALTER TYPE "admission_status" ADD VALUE IF NOT EXISTS 'waitlisted';--> statement-breakpoint
ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "score" integer;--> statement-breakpoint
ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "waitlist_rank" integer;--> statement-breakpoint
ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "decided_by" varchar(36);--> statement-breakpoint
ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "decided_at" timestamp;--> statement-breakpoint
ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "decision_reason" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admissions_status_idx" ON "admissions" ("admission_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admissions_waitlist_rank_idx" ON "admissions" ("waitlist_rank");
