CREATE TYPE "public"."code_status" AS ENUM('pending', 'success');--> statement-breakpoint
ALTER TABLE "code" ADD COLUMN "status" "code_status" DEFAULT 'pending' NOT NULL;