DO $$ BEGIN
 CREATE TYPE "staff_request_type" AS ENUM('leave', 'resource', 'facility', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "staff_request_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "staff_request_priority" AS ENUM('low', 'normal', 'high');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "staff_requests" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"staff_id" varchar(36) NOT NULL,
	"staff_name" varchar(150),
	"staff_role" varchar(30),
	"type" "staff_request_type" DEFAULT 'other' NOT NULL,
	"title" varchar(200) NOT NULL,
	"details" text,
	"priority" "staff_request_priority" DEFAULT 'normal' NOT NULL,
	"start_date" varchar(20),
	"end_date" varchar(20),
	"amount" integer,
	"status" "staff_request_status" DEFAULT 'pending' NOT NULL,
	"decided_by" varchar(36),
	"decided_at" timestamp,
	"decision_reason" text,
	"term" varchar(20),
	"session" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "staff_requests_staff_idx" ON "staff_requests" ("staff_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "staff_requests_status_idx" ON "staff_requests" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "staff_requests_type_status_idx" ON "staff_requests" ("type","status");
