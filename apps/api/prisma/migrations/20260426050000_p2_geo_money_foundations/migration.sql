-- Purpose: Phase 2 schema foundations for the data-integrity & money-flow design (Docs/12-DATA-INTEGRITY-AND-OFFLINE-DESIGN.md).
-- Why important: Adds the geographic hierarchy (sub_counties, village_units), the village admin role assignment, and the three-level allocation tables (ward_budget_allocations, village_budget_allocations) so future commits can enforce the nested money-integrity invariants. Also adds idempotency / submission-channel / allocation-actor columns on applications and disbursement-record FK chain.
-- Used by: AllocationModule (next commit), ProfileModule, OfflineModule, KioskModule, USSDModule (later phases).

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Extend existing enums
-- ────────────────────────────────────────────────────────────────────────────
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'VILLAGE_ADMIN';

ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'WARD_DISTRIBUTION_PENDING';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'VILLAGE_ALLOCATION_PENDING';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'ALLOCATED';

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Create new enums
-- ────────────────────────────────────────────────────────────────────────────
CREATE TYPE "SubmissionChannel" AS ENUM ('WEB', 'PWA_OFFLINE', 'USSD', 'KIOSK', 'PAPER');
CREATE TYPE "DistributionMethod" AS ENUM ('PROPORTIONAL', 'MANUAL_OVERRIDE', 'AI_WEIGHTED');
CREATE TYPE "AllocationActorTier" AS ENUM ('VILLAGE', 'WARD', 'COUNTY', 'FINANCE');

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Geographic hierarchy: sub_counties & village_units
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE "sub_counties" (
  "id"         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "county_id"  UUID         NOT NULL,
  "name"       VARCHAR(120) NOT NULL,
  "code"       VARCHAR(20),
  "is_active"  BOOLEAN      NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "sub_counties_county_id_fkey" FOREIGN KEY ("county_id") REFERENCES "counties"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "idx_sub_counties_county_code_unique" ON "sub_counties" ("county_id", "code");
CREATE UNIQUE INDEX "idx_sub_counties_county_name_unique" ON "sub_counties" ("county_id", "name");
CREATE INDEX "idx_sub_counties_county" ON "sub_counties" ("county_id");

CREATE TABLE "village_units" (
  "id"         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "county_id"  UUID         NOT NULL,
  "ward_id"    UUID         NOT NULL,
  "name"       VARCHAR(120) NOT NULL,
  "code"       VARCHAR(40),
  "is_active"  BOOLEAN      NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "village_units_county_id_fkey" FOREIGN KEY ("county_id") REFERENCES "counties"("id") ON DELETE CASCADE,
  CONSTRAINT "village_units_ward_id_fkey"   FOREIGN KEY ("ward_id")   REFERENCES "wards"("id")    ON DELETE CASCADE
);

CREATE UNIQUE INDEX "idx_village_units_ward_name_unique" ON "village_units" ("ward_id", "name");
CREATE INDEX "idx_village_units_county" ON "village_units" ("county_id");
CREATE INDEX "idx_village_units_ward"   ON "village_units" ("ward_id");

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Wards: add sub_county_id FK + index (free-text sub_county column kept for backward-compat during dual-write window)
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE "wards" ADD COLUMN "sub_county_id" UUID;
ALTER TABLE "wards" ADD CONSTRAINT "wards_sub_county_id_fkey"
  FOREIGN KEY ("sub_county_id") REFERENCES "sub_counties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "idx_wards_sub_county" ON "wards" ("sub_county_id");

-- ────────────────────────────────────────────────────────────────────────────
-- 5. StudentProfile: add village_unit_id FK + index (free-text village_unit column kept for dual-write)
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE "student_profiles" ADD COLUMN "village_unit_id" UUID;
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_village_unit_id_fkey"
  FOREIGN KEY ("village_unit_id") REFERENCES "village_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "idx_profile_village_unit" ON "student_profiles" ("village_unit_id");

-- ────────────────────────────────────────────────────────────────────────────
-- 6. Village admin assignments
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE "village_admin_assignments" (
  "id"                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "county_id"          UUID         NOT NULL,
  "village_unit_id"    UUID         NOT NULL,
  "user_id"            UUID         NOT NULL,
  "is_active"          BOOLEAN      NOT NULL DEFAULT true,
  "assigned_at"        TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "unavailable_until"  TIMESTAMPTZ(6),
  "unavailable_reason" VARCHAR(255),
  CONSTRAINT "village_admin_assignments_county_id_fkey"      FOREIGN KEY ("county_id")      REFERENCES "counties"("id"),
  CONSTRAINT "village_admin_assignments_village_unit_id_fkey" FOREIGN KEY ("village_unit_id") REFERENCES "village_units"("id") ON DELETE CASCADE,
  CONSTRAINT "village_admin_assignments_user_id_fkey"        FOREIGN KEY ("user_id")        REFERENCES "users"("id")
);

CREATE UNIQUE INDEX "idx_village_admin_unique" ON "village_admin_assignments" ("village_unit_id", "user_id");
CREATE INDEX "idx_village_admin_county" ON "village_admin_assignments" ("county_id");
CREATE INDEX "idx_village_admin_user"   ON "village_admin_assignments" ("user_id");
CREATE INDEX "idx_village_admin_active" ON "village_admin_assignments" ("village_unit_id", "is_active");

-- ────────────────────────────────────────────────────────────────────────────
-- 7. Money integrity: ward_budget_allocations (Invariant 2) and village_budget_allocations (Invariant 3)
--    Invariant 1 (program-level) is enforced via the existing bursary_programs.allocated_total in the
--    AllocationModule, plus the program_budget = sum(ward_pool) check at write time.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE "ward_budget_allocations" (
  "id"                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  "county_id"           UUID            NOT NULL,
  "program_id"          UUID            NOT NULL,
  "ward_id"             UUID            NOT NULL,
  "allocated_kes"       DECIMAL(15, 2)  NOT NULL,
  "allocated_total_kes" DECIMAL(15, 2)  NOT NULL DEFAULT 0,
  "disbursed_total_kes" DECIMAL(15, 2)  NOT NULL DEFAULT 0,
  "created_by"          UUID            NOT NULL,
  "created_at"          TIMESTAMPTZ(6)  NOT NULL DEFAULT NOW(),
  "updated_at"          TIMESTAMPTZ(6)  NOT NULL DEFAULT NOW(),
  CONSTRAINT "ward_budget_allocations_county_id_fkey"  FOREIGN KEY ("county_id")  REFERENCES "counties"("id"),
  CONSTRAINT "ward_budget_allocations_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "bursary_programs"("id"),
  CONSTRAINT "ward_budget_allocations_ward_id_fkey"    FOREIGN KEY ("ward_id")    REFERENCES "wards"("id"),
  CONSTRAINT "ward_budget_allocations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id"),
  CONSTRAINT "ward_alloc_amount_nonneg" CHECK ("allocated_kes" >= 0),
  CONSTRAINT "ward_alloc_invariant_2"   CHECK ("allocated_total_kes" <= "allocated_kes"),
  CONSTRAINT "ward_alloc_disbursement"  CHECK ("disbursed_total_kes" <= "allocated_total_kes")
);

CREATE UNIQUE INDEX "idx_ward_alloc_program_ward_unique" ON "ward_budget_allocations" ("program_id", "ward_id");
CREATE INDEX "idx_ward_alloc_county"  ON "ward_budget_allocations" ("county_id");
CREATE INDEX "idx_ward_alloc_program" ON "ward_budget_allocations" ("program_id");

CREATE TABLE "village_budget_allocations" (
  "id"                              UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  "county_id"                       UUID                  NOT NULL,
  "program_id"                      UUID                  NOT NULL,
  "ward_budget_allocation_id"       UUID                  NOT NULL,
  "ward_id"                         UUID                  NOT NULL,
  "village_unit_id"                 UUID                  NOT NULL,
  "allocated_kes"                   DECIMAL(15, 2)        NOT NULL,
  "allocated_total_kes"             DECIMAL(15, 2)        NOT NULL DEFAULT 0,
  "disbursed_total_kes"             DECIMAL(15, 2)        NOT NULL DEFAULT 0,
  "applicant_count_at_distribution" INTEGER               NOT NULL,
  "distribution_method"             "DistributionMethod"  NOT NULL,
  "village_allocation_due_at"       TIMESTAMPTZ(6),
  "created_by"                      UUID                  NOT NULL,
  "created_at"                      TIMESTAMPTZ(6)        NOT NULL DEFAULT NOW(),
  "updated_at"                      TIMESTAMPTZ(6)        NOT NULL DEFAULT NOW(),
  CONSTRAINT "village_budget_allocations_county_id_fkey"                 FOREIGN KEY ("county_id")                 REFERENCES "counties"("id"),
  CONSTRAINT "village_budget_allocations_program_id_fkey"                FOREIGN KEY ("program_id")                REFERENCES "bursary_programs"("id"),
  CONSTRAINT "village_budget_allocations_ward_budget_allocation_id_fkey" FOREIGN KEY ("ward_budget_allocation_id") REFERENCES "ward_budget_allocations"("id"),
  CONSTRAINT "village_budget_allocations_ward_id_fkey"                   FOREIGN KEY ("ward_id")                   REFERENCES "wards"("id"),
  CONSTRAINT "village_budget_allocations_village_unit_id_fkey"           FOREIGN KEY ("village_unit_id")           REFERENCES "village_units"("id"),
  CONSTRAINT "village_budget_allocations_created_by_fkey"                FOREIGN KEY ("created_by")                REFERENCES "users"("id"),
  CONSTRAINT "village_alloc_amount_nonneg" CHECK ("allocated_kes" >= 0),
  CONSTRAINT "village_alloc_invariant_3"   CHECK ("allocated_total_kes" <= "allocated_kes"),
  CONSTRAINT "village_alloc_disbursement"  CHECK ("disbursed_total_kes" <= "allocated_total_kes")
);

CREATE UNIQUE INDEX "idx_village_alloc_program_village_unique" ON "village_budget_allocations" ("program_id", "village_unit_id");
CREATE INDEX "idx_village_alloc_county" ON "village_budget_allocations" ("county_id");
CREATE INDEX "idx_village_alloc_ward"   ON "village_budget_allocations" ("ward_budget_allocation_id");
CREATE INDEX "idx_village_alloc_due"    ON "village_budget_allocations" ("village_allocation_due_at");

-- ────────────────────────────────────────────────────────────────────────────
-- 8. Residence attestations (VILLAGE_ADMIN attests applicants in their village)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE "residence_attestations" (
  "id"               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  "county_id"        UUID           NOT NULL,
  "applicant_id"     UUID           NOT NULL,
  "application_id"   UUID,
  "attester_id"      UUID           NOT NULL,
  "village_unit_id"  UUID           NOT NULL,
  "ward_id"          UUID           NOT NULL,
  "attested_at"      TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "expires_at"       TIMESTAMPTZ(6) NOT NULL,
  "signature_s3_key" TEXT,
  "notes"            TEXT,
  CONSTRAINT "residence_attestations_county_id_fkey"       FOREIGN KEY ("county_id")       REFERENCES "counties"("id"),
  CONSTRAINT "residence_attestations_applicant_id_fkey"    FOREIGN KEY ("applicant_id")    REFERENCES "users"("id"),
  CONSTRAINT "residence_attestations_application_id_fkey"  FOREIGN KEY ("application_id")  REFERENCES "applications"("id"),
  CONSTRAINT "residence_attestations_attester_id_fkey"     FOREIGN KEY ("attester_id")     REFERENCES "users"("id"),
  CONSTRAINT "residence_attestations_village_unit_id_fkey" FOREIGN KEY ("village_unit_id") REFERENCES "village_units"("id"),
  CONSTRAINT "residence_attestations_ward_id_fkey"         FOREIGN KEY ("ward_id")         REFERENCES "wards"("id")
);

CREATE INDEX "idx_attestations_county"          ON "residence_attestations" ("county_id");
CREATE INDEX "idx_attestations_applicant"       ON "residence_attestations" ("applicant_id");
CREATE INDEX "idx_attestations_attester"        ON "residence_attestations" ("attester_id");
CREATE INDEX "idx_attestations_village_expiry"  ON "residence_attestations" ("village_unit_id", "expires_at");

-- ────────────────────────────────────────────────────────────────────────────
-- 9. Applications: idempotency, channel, allocation FKs, allocation actor
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE "applications" ADD COLUMN "client_idempotency_key"      UUID;
ALTER TABLE "applications" ADD COLUMN "submission_channel"          "SubmissionChannel" NOT NULL DEFAULT 'WEB';
ALTER TABLE "applications" ADD COLUMN "village_budget_allocation_id" UUID;
ALTER TABLE "applications" ADD COLUMN "ward_budget_allocation_id"    UUID;
ALTER TABLE "applications" ADD COLUMN "allocation_actor_id"          UUID;
ALTER TABLE "applications" ADD COLUMN "allocation_actor_tier"        "AllocationActorTier";
ALTER TABLE "applications" ADD COLUMN "allocated_at"                 TIMESTAMPTZ(6);

ALTER TABLE "applications" ADD CONSTRAINT "applications_village_budget_allocation_id_fkey"
  FOREIGN KEY ("village_budget_allocation_id") REFERENCES "village_budget_allocations"("id") ON DELETE SET NULL;
ALTER TABLE "applications" ADD CONSTRAINT "applications_ward_budget_allocation_id_fkey"
  FOREIGN KEY ("ward_budget_allocation_id") REFERENCES "ward_budget_allocations"("id") ON DELETE SET NULL;
ALTER TABLE "applications" ADD CONSTRAINT "applications_allocation_actor_id_fkey"
  FOREIGN KEY ("allocation_actor_id") REFERENCES "users"("id") ON DELETE SET NULL;

CREATE UNIQUE INDEX "idx_applications_idempotency"   ON "applications" ("client_idempotency_key") WHERE "client_idempotency_key" IS NOT NULL;
CREATE INDEX "idx_applications_village_alloc"        ON "applications" ("village_budget_allocation_id");

-- ────────────────────────────────────────────────────────────────────────────
-- 10. Disbursement records: FK chain back to authorizing allocations
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE "disbursement_records" ADD COLUMN "village_budget_allocation_id" UUID;
ALTER TABLE "disbursement_records" ADD COLUMN "ward_budget_allocation_id"    UUID;

ALTER TABLE "disbursement_records" ADD CONSTRAINT "disbursement_records_village_budget_allocation_id_fkey"
  FOREIGN KEY ("village_budget_allocation_id") REFERENCES "village_budget_allocations"("id") ON DELETE SET NULL;
ALTER TABLE "disbursement_records" ADD CONSTRAINT "disbursement_records_ward_budget_allocation_id_fkey"
  FOREIGN KEY ("ward_budget_allocation_id") REFERENCES "ward_budget_allocations"("id") ON DELETE SET NULL;

CREATE INDEX "idx_disbursement_village_alloc" ON "disbursement_records" ("village_budget_allocation_id");

-- Enforce: a non-PENDING disbursement must trace back to a village allocation (Invariant chain integrity).
-- Allowed: PENDING records may not yet have an allocation linked (e.g., legacy data, retry queue).
ALTER TABLE "disbursement_records" ADD CONSTRAINT "disbursement_must_have_village_alloc"
  CHECK ("status" = 'PENDING' OR "village_budget_allocation_id" IS NOT NULL);
