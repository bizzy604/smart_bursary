-- Purpose: Enforce county-scoped uniqueness for student national IDs.
-- Why important: Prevents duplicate identity records within the same county tenant.
-- Used by: Phase 2A profile integrity hardening.
ALTER TABLE "student_profiles"
ADD CONSTRAINT "idx_profile_county_national_id_unique"
UNIQUE ("county_id", "national_id");
