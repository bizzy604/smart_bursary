-- Purpose: Enable Row-Level Security on the Phase-2 geographic + money-flow
-- tables and gate them by the application-set `app.current_county_id`
-- session var.
--
-- Why important: Until now the project has relied entirely on application-layer
--                `where: { countyId }` filters. That works as long as every
--                service remembers to add the filter — but a single forgotten
--                clause leaks cross-tenant data. RLS is the database-side
--                belt-and-braces protection for the §7 money-flow tables.
--
-- Compatibility design:
--   - The existing `PrismaService.withTenantContext` helper writes
--     `app.current_county_id` to the session via `set_config(..., true)` so
--     it's scoped to the surrounding transaction.
--   - Most services today DO NOT yet call `withTenantContext` (it was wired
--     but never adopted). To avoid breaking those services in this commit,
--     the policies BELOW are *permissive when the session var is unset*:
--
--         current_setting('app.current_county_id', true) IS NULL
--      OR current_setting('app.current_county_id', true) = ''
--
--     ⇒ allow the row through (matches today's behaviour exactly).
--
--   - Once a session var IS set (callers wrapped in `withTenantContext`),
--     the policy becomes RESTRICTIVE: only rows whose `county_id` matches
--     the session var are visible.
--
-- This is a strict-by-design opt-in rollout: services migrated to
-- `withTenantContext` get full RLS protection immediately; un-migrated
-- services continue to work as before. A follow-up commit migrates the
-- service layer wholesale and removes the "permissive when unset" branch.
--
-- Scope:
--   ✓ sub_counties, village_units, village_admin_assignments,
--     ward_budget_allocations, village_budget_allocations,
--     residence_attestations  ← new Phase-2 tables (county-scoped)
--   ✗ identity_registry  ← INTENTIONALLY cross-tenant. Its entire purpose
--     is detecting duplicates ACROSS counties; it has no county_id
--     discriminator at the row level. RLS would defeat its function.
--
-- A subsequent hardening commit will extend RLS to the legacy core tables
-- (applications, users, student_profiles, bursary_programs, wards,
--  application_reviews, disbursement_records, etc.) once every service
-- has been migrated to `withTenantContext`.

-- ─────────────────────────────────────────────────────────────────────
-- Helper note on `current_setting(..., true)` behaviour:
--   - Second arg `true` = "missing_ok": returns NULL instead of erroring
--     when the session var hasn't been set.
--   - Cast to ::text on county_id is required because the columns are
--     UUID and the session var is a string.
-- ─────────────────────────────────────────────────────────────────────

-- ─── sub_counties ──────────────────────────────────────────────────
ALTER TABLE "sub_counties" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "p2_sub_counties_tenant_scope" ON "sub_counties"
  USING (
    current_setting('app.current_county_id', true) IS NULL
    OR current_setting('app.current_county_id', true) = ''
    OR "county_id"::text = current_setting('app.current_county_id', true)
  );

-- ─── village_units ─────────────────────────────────────────────────
ALTER TABLE "village_units" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "p2_village_units_tenant_scope" ON "village_units"
  USING (
    current_setting('app.current_county_id', true) IS NULL
    OR current_setting('app.current_county_id', true) = ''
    OR "county_id"::text = current_setting('app.current_county_id', true)
  );

-- ─── village_admin_assignments ─────────────────────────────────────
ALTER TABLE "village_admin_assignments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "p2_village_admin_assignments_tenant_scope" ON "village_admin_assignments"
  USING (
    current_setting('app.current_county_id', true) IS NULL
    OR current_setting('app.current_county_id', true) = ''
    OR "county_id"::text = current_setting('app.current_county_id', true)
  );

-- ─── ward_budget_allocations ───────────────────────────────────────
ALTER TABLE "ward_budget_allocations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "p2_ward_budget_allocations_tenant_scope" ON "ward_budget_allocations"
  USING (
    current_setting('app.current_county_id', true) IS NULL
    OR current_setting('app.current_county_id', true) = ''
    OR "county_id"::text = current_setting('app.current_county_id', true)
  );

-- ─── village_budget_allocations ────────────────────────────────────
ALTER TABLE "village_budget_allocations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "p2_village_budget_allocations_tenant_scope" ON "village_budget_allocations"
  USING (
    current_setting('app.current_county_id', true) IS NULL
    OR current_setting('app.current_county_id', true) = ''
    OR "county_id"::text = current_setting('app.current_county_id', true)
  );

-- ─── residence_attestations ────────────────────────────────────────
ALTER TABLE "residence_attestations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "p2_residence_attestations_tenant_scope" ON "residence_attestations"
  USING (
    current_setting('app.current_county_id', true) IS NULL
    OR current_setting('app.current_county_id', true) = ''
    OR "county_id"::text = current_setting('app.current_county_id', true)
  );

-- NOTE: identity_registry intentionally skipped — its purpose is cross-county
-- duplicate detection. Adding RLS would defeat the L2 ghost-student lock.
