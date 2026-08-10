DO $$ BEGIN
 CREATE TYPE "attendance_type" AS ENUM('period', 'full_day');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "attendance_status" AS ENUM('present', 'absent', 'late', 'excused');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attendance" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"attendance_type" "attendance_type" NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"class" varchar(50) NOT NULL,
	"subject" varchar(100),
	"period" varchar(20),
	"attendance_status" "attendance_status" DEFAULT 'present' NOT NULL,
	"date" varchar(20) NOT NULL,
	"term" varchar(20),
	"session" varchar(20),
	"remarks" varchar(255),
	"recorded_by" varchar(36) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendance_student_date_idx" ON "attendance" ("student_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendance_class_date_idx" ON "attendance" ("class","date");
