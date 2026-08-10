DO $$ BEGIN
 CREATE TYPE "discipline_severity" AS ENUM('minor', 'moderate', 'serious', 'severe');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "discipline_status" AS ENUM('open', 'escalated', 'resolved', 'dismissed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "discipline_action" AS ENUM('none', 'warning', 'detention', 'parent_meeting', 'suspension', 'expulsion', 'counseling');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "discipline_incidents" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"student_name" varchar(150),
	"class" varchar(50) NOT NULL,
	"category" varchar(80) NOT NULL,
	"severity" "discipline_severity" DEFAULT 'minor' NOT NULL,
	"description" text NOT NULL,
	"incident_date" varchar(20) NOT NULL,
	"status" "discipline_status" DEFAULT 'open' NOT NULL,
	"reported_by" varchar(36) NOT NULL,
	"reporter_name" varchar(150),
	"escalated_by" varchar(36),
	"escalated_at" timestamp,
	"action" "discipline_action" DEFAULT 'none' NOT NULL,
	"action_detail" text,
	"resolution_note" text,
	"resolved_by" varchar(36),
	"resolved_at" timestamp,
	"term" varchar(20),
	"session" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "discipline_class_status_idx" ON "discipline_incidents" ("class","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "discipline_status_idx" ON "discipline_incidents" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "discipline_student_idx" ON "discipline_incidents" ("student_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "discipline_severity_idx" ON "discipline_incidents" ("severity");
