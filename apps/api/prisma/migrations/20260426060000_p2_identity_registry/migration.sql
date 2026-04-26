-- Purpose: Phase 2 — cross-county identity registry (§5.3 L2 of Docs/12-DATA-INTEGRITY-AND-OFFLINE-DESIGN.md).
-- Why important: Provides the platform-scoped lookup table that prevents Type-C ghost students
--                (one identity, multiple counties in the same intake cycle). Stores HMAC-SHA256
--                hashes only — never plaintext national IDs — and lives outside RLS so that the
--                cross-county active-cycle check can run from any tenant context.
-- Used by: IdentityRegistryService.claim/release; integrated into application submission in a follow-up commit.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Add encrypted birth_certificate_number to student_profiles for minors
--    who do not yet hold a national ID.
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE "student_profiles" ADD COLUMN "birth_certificate_number" BYTEA;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. identity_registry — platform-scoped (NO county_id, NO RLS).
--    The PK is the HMAC-SHA256 of the chosen identity key (national_id, birth_cert
--    or NEMIS UPI). At most one row per identity.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE "identity_registry" (
  "identity_hash"               BYTEA          PRIMARY KEY,
  "active_application_id"       UUID,
  "active_county_id"            UUID           NOT NULL,
  "active_cycle"                VARCHAR(20)    NOT NULL,
  "active_status"               "ApplicationStatus",
  "first_registered_county_id"  UUID           NOT NULL,
  "first_registered_at"         TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "released_at"                 TIMESTAMPTZ(6),
  "updated_at"                  TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "identity_registry_active_county_fkey"        FOREIGN KEY ("active_county_id")           REFERENCES "counties"("id"),
  CONSTRAINT "identity_registry_first_registered_county_fk" FOREIGN KEY ("first_registered_county_id") REFERENCES "counties"("id"),
  CONSTRAINT "identity_registry_active_application_fkey"   FOREIGN KEY ("active_application_id")      REFERENCES "applications"("id") ON DELETE SET NULL
);

CREATE INDEX "idx_identity_registry_active_cycle" ON "identity_registry" ("active_cycle");
CREATE INDEX "idx_identity_registry_active_application" ON "identity_registry" ("active_application_id") WHERE "active_application_id" IS NOT NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- Note: this table intentionally does NOT enable RLS — by design it is the
-- platform-scoped surface that bypasses tenant isolation to detect cross-county
-- duplicates. Access is gated at the service layer (IdentityRegistryService is
-- only invoked from internal allocation/submission code paths).
-- ────────────────────────────────────────────────────────────────────────────
