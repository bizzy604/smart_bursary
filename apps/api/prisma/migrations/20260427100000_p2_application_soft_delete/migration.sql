-- Phase 2B (Applications): add deletedAt soft-delete column for student delete-draft + withdraw lifecycle
ALTER TABLE "applications"
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ(6);

CREATE INDEX IF NOT EXISTS "idx_applications_deleted_at"
  ON "applications" ("deleted_at");
