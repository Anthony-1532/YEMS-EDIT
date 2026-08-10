DO $$ BEGIN
 CREATE TYPE "expense_status" AS ENUM('pending', 'approved', 'rejected');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "expenses" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"category" varchar(80) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"amount" integer NOT NULL,
	"vendor" varchar(150),
	"expense_date" varchar(20) NOT NULL,
	"status" "expense_status" DEFAULT 'pending' NOT NULL,
	"requires_approval" integer DEFAULT 1 NOT NULL,
	"recorded_by" varchar(36) NOT NULL,
	"recorded_by_name" varchar(150),
	"decided_by" varchar(36),
	"decided_at" timestamp,
	"decision_reason" text,
	"term" varchar(20),
	"session" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expenses_status_idx" ON "expenses" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expenses_category_idx" ON "expenses" ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expenses_date_idx" ON "expenses" ("expense_date");
