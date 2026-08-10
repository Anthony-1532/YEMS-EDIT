CREATE TABLE "classes" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"level" varchar(20) NOT NULL,
	"stream" varchar(20) NOT NULL,
	"display_name" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);