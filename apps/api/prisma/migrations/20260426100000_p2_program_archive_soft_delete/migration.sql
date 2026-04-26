-- Phase 2B (Programs): add ARCHIVED status and deletedAt soft-delete column
ALTER TYPE "ProgramStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

ALTER TABLE "bursary_programs"
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ(6);

CREATE INDEX IF NOT EXISTS "idx_programs_deleted_at"
  ON "bursary_programs" ("deleted_at");
