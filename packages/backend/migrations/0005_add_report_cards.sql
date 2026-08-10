DO $$ BEGIN
 CREATE TYPE "report_card_status" AS ENUM('draft', 'submitted', 'principal_approved', 'returned', 'sent');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "report_cards" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"student_name" varchar(150),
	"class" varchar(50) NOT NULL,
	"term" varchar(20) NOT NULL,
	"session" varchar(20) NOT NULL,
	"report_card_status" "report_card_status" DEFAULT 'draft' NOT NULL,
	"subjects" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"overall_total" integer,
	"overall_average" integer,
	"position" varchar(20),
	"attendance_summary" varchar(100),
	"class_teacher_remark" text,
	"principal_comment" text,
	"compiled_by" varchar(36) NOT NULL,
	"submitted_at" timestamp,
	"reviewed_by" varchar(36),
	"reviewed_at" timestamp,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "report_cards_student_term_idx" ON "report_cards" ("student_id","term","session");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "report_cards_class_status_idx" ON "report_cards" ("class","report_card_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "report_cards_status_idx" ON "report_cards" ("report_card_status");
