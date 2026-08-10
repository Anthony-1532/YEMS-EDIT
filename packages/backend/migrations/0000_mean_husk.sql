CREATE TYPE "public"."admission_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."due_class" AS ENUM('due-today', 'due-days', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('active', 'draft', 'archived');--> statement-breakpoint
CREATE TYPE "public"."exam_format" AS ENUM('mcq', 'theory', 'both');--> statement-breakpoint
CREATE TYPE "public"."exam_status" AS ENUM('not-started', 'upcoming', 'active', 'completed');--> statement-breakpoint
CREATE TYPE "public"."exam_type" AS ENUM('quiz', 'midterm', 'final', 'practice');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('student', 'teacher', 'admin', 'superadmin', 'accountant', 'technician', 'principal', 'hod', 'parent');--> statement-breakpoint
CREATE TYPE "public"."notif_type" AS ENUM('note', 'exam', 'assignment', 'result', 'system');--> statement-breakpoint
CREATE TYPE "public"."report_category" AS ENUM('feedback', 'bug', 'suggestion', 'complaint', 'emergency');--> statement-breakpoint
CREATE TABLE "account_settings" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"fee_amount" integer DEFAULT 50000,
	"threshold_30" integer DEFAULT 15000,
	"threshold_70" integer DEFAULT 35000,
	"school_email" varchar(255),
	"email_subject" varchar(255),
	"account_number" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bills" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"student_name" varchar(255),
	"class" varchar(20),
	"amount" integer NOT NULL,
	"description" varchar(255),
	"due_date" timestamp,
	"status" varchar(20) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"bill_id" varchar(36),
	"student_id" varchar(36) NOT NULL,
	"student_name" varchar(255),
	"class" varchar(20),
	"amount" integer NOT NULL,
	"payment_method" varchar(50),
	"reference" varchar(100),
	"status" varchar(20) DEFAULT 'completed',
	"paid_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admissions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255),
	"phone" varchar(20),
	"date_of_birth" varchar(20),
	"gender" varchar(10),
	"class" varchar(20),
	"parent_name" varchar(255),
	"parent_phone" varchar(20),
	"admission_status" "admission_status" DEFAULT 'pending',
	"session" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"subject" varchar(100),
	"status" "status" DEFAULT 'active',
	"due_date" timestamp,
	"due_label" varchar(50),
	"due_class" "due_class",
	"est" varchar(20),
	"icon" varchar(10),
	"icon_color" varchar(20),
	"created_by" varchar(36) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" varchar(36),
	"actor_id" varchar(36) NOT NULL,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exams" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"exam_type" "exam_type" NOT NULL,
	"exam_format" "exam_format" DEFAULT 'mcq',
	"questions" jsonb,
	"duration" integer,
	"passing_score" integer,
	"subject" varchar(100),
	"exam_status" "exam_status" DEFAULT 'not-started',
	"questions_count" integer,
	"questions_list" jsonb,
	"icon" varchar(10),
	"bg" varchar(20),
	"icon_color" varchar(20),
	"start_time" timestamp,
	"created_by" varchar(36) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"initials" varchar(10),
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"role" "role" DEFAULT 'student' NOT NULL,
	"student_id" varchar(50),
	"teacher_id" varchar(50),
	"admin_id" varchar(50),
	"accountant_id" varchar(50),
	"class" varchar(20),
	"session" varchar(20) DEFAULT '2024/2025',
	"term" varchar(20) DEFAULT 'Second Term',
	"sex" varchar(10),
	"admission_no" varchar(50),
	"assigned_subjects" text,
	"assigned_classes" text,
	"is_class_teacher" boolean DEFAULT false,
	"class_teacher_of" varchar(20),
	"email_verified" boolean DEFAULT false,
	"is_suspended" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text,
	"subject" varchar(100),
	"subject_id" varchar(36),
	"week" varchar(10),
	"term" varchar(20),
	"date" varchar(20),
	"icon" varchar(10),
	"icon_color" varchar(20),
	"file_data" text,
	"file_name" varchar(100),
	"created_by" varchar(36) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"token" varchar(512) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "institutions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text,
	"contact_email" varchar(255),
	"status" varchar(20) DEFAULT 'active',
	"students" integer DEFAULT 0,
	"teachers" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(20),
	"description" text,
	"category" varchar(20) NOT NULL,
	"department" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subjects_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "results" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"exam_id" varchar(36),
	"subject" varchar(100) NOT NULL,
	"score" integer NOT NULL,
	"total_score" integer NOT NULL,
	"grade" varchar(5),
	"remarks" varchar(255),
	"class" varchar(20),
	"session" varchar(20),
	"term" varchar(20),
	"exam_title" varchar(255),
	"date" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"notif_type" "notif_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"note_id" varchar(36),
	"exam_id" varchar(36),
	"assignment_id" varchar(36),
	"from_user_id" varchar(36),
	"to_user_id" varchar(36),
	"read" boolean DEFAULT false,
	"date" varchar(20),
	"timestamp" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"exam_id" varchar(36) NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"answers" jsonb,
	"score" integer,
	"total_score" integer,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"graded_by" varchar(36),
	"graded_at" timestamp,
	"feedback" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"subject" varchar(100) NOT NULL,
	"topic" varchar(255) NOT NULL,
	"time" varchar(50),
	"is_live" boolean DEFAULT false,
	"icon" varchar(10),
	"icon_bg" varchar(20),
	"icon_color" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schemes" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"subject" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"week" varchar(10),
	"term" varchar(20),
	"class" varchar(20),
	"created_by" varchar(36),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_plans" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"subject" varchar(100) NOT NULL,
	"topic" varchar(255) NOT NULL,
	"week" varchar(10),
	"term" varchar(20),
	"class" varchar(20),
	"objectives" text,
	"materials" text,
	"created_by" varchar(36),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "midterm_results" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"student_name" varchar(255),
	"class" varchar(20) NOT NULL,
	"subject" varchar(100) NOT NULL,
	"ca_score" integer,
	"exam_score" integer,
	"total_score" integer,
	"grade" varchar(5),
	"term" varchar(20),
	"session" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"user_name" varchar(255),
	"report_category" "report_category" NOT NULL,
	"description" text NOT NULL,
	"read" boolean DEFAULT false,
	"status" varchar(20) DEFAULT 'pending',
	"date" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backups" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"size" varchar(50) DEFAULT '0 MB' NOT NULL,
	"type" varchar(50) DEFAULT 'manual' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"platform_name" varchar(255) DEFAULT 'Yeshua Educational Platform' NOT NULL,
	"support_email" varchar(255) DEFAULT 'support@yems.local' NOT NULL,
	"max_users_per_institution" integer DEFAULT 1000 NOT NULL,
	"session_timeout" integer DEFAULT 60 NOT NULL,
	"enable_2fa" boolean DEFAULT false NOT NULL,
	"force_password_change" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rbac_roles" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"permissions" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rbac_roles_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "submissions_exam_student_unique" ON "submissions" USING btree ("exam_id","student_id");