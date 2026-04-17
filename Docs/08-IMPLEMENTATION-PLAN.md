# KauntyBursary Gap Closure and Hardening Implementation Plan

Status: In Progress (Phase 2B Completed, W6 In Progress)
Last Updated: 2026-04-17
Owner: Engineering Team
References: 01-PRD.md, 02-SYSTEM_DESIGN.md, 04-API-DESIGN.md, 07-TESTING-STRATEGY.md

## Current Execution Status

- Phase 0: Completed (traceability matrix delivered).
- Phase 1: Completed.
  - Implementation: Complete for Programs lifecycle API surface.
  - Validation: Complete.
    - `pnpm --filter @smart-bursary/api run build` passed.
    - `pnpm --filter @smart-bursary/api exec prisma migrate deploy` passed.
    - `pnpm --filter @smart-bursary/api exec jest --config jest.config.ts test/integration/program-lifecycle.e2e-spec.ts` passed (8/8).
- Phase 2: Completed.
  - Implementation: Eligibility engine and student eligibility visibility implemented.
  - Validation: Complete.
    - `pnpm --filter @smart-bursary/api run build` passed.
    - `pnpm --filter @smart-bursary/api exec prisma migrate deploy` passed.
    - `pnpm --filter @smart-bursary/api exec jest --config jest.config.ts test/integration/student-application.e2e-spec.ts test/integration/program-lifecycle.e2e-spec.ts test/integration/program-eligibility.e2e-spec.ts` passed (20/20).
- Phase 2A: Completed.
  - Implementation: Profile APIs, submission readiness gating, and county-level national ID uniqueness completed.
  - Validation: Complete.
    - `pnpm --filter @smart-bursary/api run build` passed.
    - `pnpm --filter @smart-bursary/api exec prisma migrate deploy` passed.
    - `pnpm --filter @smart-bursary/api exec jest --config jest.config.ts test/integration/student-application.e2e-spec.ts test/integration/program-lifecycle.e2e-spec.ts test/integration/program-eligibility.e2e-spec.ts test/integration/profile-gating.e2e-spec.ts` passed (23/23).
- Phase 2B: Completed.
  - Implementation: Real PDF generation for student preview/download flows and S3-only document storage abstraction with signed download URLs.
  - Validation: Complete.
    - `pnpm --filter @smart-bursary/web run test` passed.
    - `pnpm --filter @smart-bursary/web run typecheck` passed.
    - `pnpm --filter @smart-bursary/web run build` passed.
    - `pnpm --filter @smart-bursary/api run build` passed.
    - `pnpm test -- test/integration/document.e2e-spec.ts test/integration/document-scan-auth.e2e-spec.ts` in `apps/api` passed (13/13) after bringing up local `postgres` and `redis`, applying migrations, and seeding.
- Phase 6 (W6): In Progress.
  - Implementation: Frontend unit/component test harness and initial critical-flow tests added.
  - Validation (current slice):
    - `pnpm --filter @smart-bursary/web run test` passed (13/13, repeated run).
    - `pnpm --filter @smart-bursary/web run typecheck` passed.
    - `pnpm --filter @smart-bursary/web run build` passed.
- Next phase start: Phase 2C is ready when execution approval is given.

## 1. Objective

Close all currently identified PRD/API gaps and complete hardening work required for a production release candidate.

This plan is designed to be executed one phase at a time, with strict completion gates before moving forward.

## 2. Confirmed Gap Baseline (As of 2026-04-17)

### G-01 Programs management API gap (critical)
- Lifecycle endpoints are now implemented in code: `POST /programs`, `PATCH /programs/:id`, `POST /programs/:id/publish`, `POST /programs/:id/close`.
- DTO scaffolds for program create/update are implemented.
- Build and integration validation are complete for this scope.

### G-02 County Admin settings gap (critical)
- Multiple county settings routes are still placeholders:
  - Settings home
  - Programs list/new/edit
  - AI scoring settings
  - Branding settings
  - Users and ward management

### G-03 Eligibility behavior gap (high)
- Eligibility engine is implemented and student program discovery now returns eligibility flags and reasons.
- Ineligible draft creation and closed-window submission now return semantic `422` error codes.

### G-04 Hardening phases incomplete (critical for release)
- Frontend W6 (testing/hardening) is In Progress.
- Backend P7 (hardening/release readiness) remains Not Started.

### G-05 PRD full-traceability gap (high)
- Traceability matrix is now delivered in `Docs/09-PRD-TRACEABILITY-MATRIX.md`.
- Remaining work is status maintenance as implementation changes land.

## 3. Delivery Rules for This Plan

1. One active phase at a time.
2. No phase rollover until implementation, validation, and tracker updates are complete.
3. Each phase must pass build, tests, and edge-case checks for touched modules.
4. If validation fails, remain in the current phase and resolve before continuing.

## 4. Execution Strategy

We execute in two tracks, still serially by phase:

- Functional Closure Track: fill missing PRD/API behavior.
- Hardening Track: quality, security, performance, reliability, and release readiness.

## 5. Phase Roadmap

## Phase 0 - PRD Traceability Baseline

Goal: Establish one canonical requirement-to-implementation matrix to prevent hidden gaps.

Scope:
- Create a PRD traceability matrix for all functional IDs (TM, AU, SP, BP, AF, AI, RW, DB, RP).
- Tag each requirement: Implemented, Partial, Missing, Deferred.
- Attach evidence path for each Implemented/Partial requirement.

Deliverables:
- `Docs/09-PRD-TRACEABILITY-MATRIX.md`
- Tracker correction notes where status text is stale.

Validation:
- Matrix includes 100 percent of PRD functional IDs.
- Every row has an owner and target phase.

Exit Criteria:
- No unclassified functional requirement remains.

---

## Phase 1 - Programs API Lifecycle (Backend)

Goal: Complete Programs management APIs per API specification.

PRD/API Mapping:
- BP-01, BP-03
- API section: Program Endpoints (`POST`, `PATCH`, `publish`, `close`)

Scope:
- Implement DTOs and service methods for create/update/publish/close.
- Enforce role access (COUNTY_ADMIN and PLATFORM_OPERATOR where applicable).
- Validate temporal rules (`opens_at < closes_at`, cannot edit ACTIVE except allowed fields).
- Preserve county isolation and audit timeline entries.

Primary Files:
- `apps/api/modules/program/program.controller.ts`
- `apps/api/modules/program/program.service.ts`
- `apps/api/modules/program/dto/create-program.dto.ts`
- `apps/api/modules/program/dto/update-program.dto.ts` (new)
- `apps/api/modules/program/dto/publish-program.dto.ts` (new if needed)

Tests:
- New integration spec for full program lifecycle endpoints.
- Negative cases: invalid dates, unauthorized role, wrong county, duplicate names (if constrained).

Validation Commands:
- `pnpm --filter @smart-bursary/api run build`
- `pnpm --filter @smart-bursary/api exec jest --config jest.config.ts test/integration/program*.e2e-spec.ts`

Exit Criteria:
- All Program lifecycle endpoints exist and pass integration tests.

Current phase notes:
- Implemented endpoints and lifecycle service split:
  - `POST /programs`
  - `PATCH /programs/:id`
  - `POST /programs/:id/publish`
  - `POST /programs/:id/close`
- Added DTO validation and integration test coverage in code.
- Architecture compliance restored (no source file over 200 lines).
- Phase is completed for this scope after green build, migration check, and integration tests.

---

## Phase 2 - Eligibility Engine and Program Discovery

Goal: Enforce eligibility visibility and reason codes for student-facing program discovery.

PRD/API Mapping:
- BP-02
- API section: `GET /programs` response fields `eligible` and `ineligibility_reason`

Scope:
- Implement `eligibility.service.ts` for profile-driven eligibility checks.
- Return program eligibility flags and denial reason when ineligible.
- Ensure submission/create actions reject ineligible attempts with correct semantic status.

Primary Files:
- `apps/api/modules/program/eligibility.service.ts`
- `apps/api/modules/program/program.service.ts`
- `apps/api/modules/application/application-submission.service.ts`
- `apps/api/common/filters/global-exception.filter.ts`

Tests:
- Eligible student sees allowed programs.
- Ineligible student receives lock reason.
- Ineligible create/submit paths return semantic validation errors.
- Late submission path returns semantic `PROGRAM_CLOSED` validation error.

Validation Commands:
- `pnpm --filter @smart-bursary/api run build`
- `pnpm --filter @smart-bursary/api exec jest --config jest.config.ts test/integration/student-application.e2e-spec.ts test/integration/program*.e2e-spec.ts`

Exit Criteria:
- Eligibility behavior matches PRD/API contract and test coverage for edge cases is in place.

Current phase notes:
- Added `eligibility.service.ts` with education-level and income-bracket rule evaluation.
- Program list endpoints now include `eligible`, `ineligibilityReason`, and `ineligibility_reason` for student responses.
- Application draft/submit orchestration now enforces ineligibility and closed-window semantics with domain error codes.
- Phase is completed for this scope after green build, migration check, and integration tests.

---

## Phase 3 - County Admin Program UI

Goal: Replace program settings placeholders with functional flows wired to backend APIs.

PRD/API Mapping:
- P4 persona needs (configure bursary programs)
- BP-01 through BP-03

Scope:
- Implement settings program list page.
- Implement create, edit, publish, close flows.
- Add inline validation and clear error mapping from API responses.

Primary Files:
- `apps/web/app/(admin)/settings/programs/page.tsx`
- `apps/web/app/(admin)/settings/programs/new/page.tsx`
- `apps/web/app/(admin)/settings/programs/[id]/page.tsx`
- `apps/web/lib/*` admin API client modules as needed

Tests:
- Component tests for forms and transitions.
- E2E scenario for create -> publish -> close lifecycle.

Validation Commands:
- `pnpm --filter @smart-bursary/web run typecheck`
- `pnpm --filter @smart-bursary/web run build`
- `pnpm --filter @smart-bursary/web run test`

Exit Criteria:
- Program management UX is production-usable and placeholder removed.

---

## Phase 4 - County Admin Settings Completion (Branding, Users, Wards, AI Weights)

Goal: Complete the remaining settings surfaces required by PRD.

PRD/API Mapping:
- P4 persona needs
- AF-06 (form customization)
- AI-05 (scoring weight configuration)
- TM-02 (tenant branding)

Scope:
- Branding settings page with logo and color management.
- Users management page for ward/admin account operations.
- Wards management page for assignments and visibility.
- AI scoring settings page wired to scoring-weight API.

Primary Files:
- `apps/web/app/(admin)/settings/branding/page.tsx`
- `apps/web/app/(admin)/settings/users/page.tsx`
- `apps/web/app/(admin)/settings/users/new/page.tsx`
- `apps/web/app/(admin)/settings/wards/page.tsx`
- `apps/web/app/(admin)/settings/ai-scoring/page.tsx`
- Matching backend endpoints in tenant/user modules where missing

Tests:
- Frontend component and route tests for each settings vertical.
- API integration tests for permissions and county isolation.

Validation Commands:
- `pnpm --filter @smart-bursary/web run typecheck`
- `pnpm --filter @smart-bursary/web run build`
- `pnpm --filter @smart-bursary/api run build`
- `pnpm --filter @smart-bursary/api exec jest --config jest.config.ts test/integration/*.e2e-spec.ts`

Exit Criteria:
- All listed settings routes are functional, no placeholder screen remains.

---

## Phase 5 - Reporting Functional Completion

Goal: Close remaining reporting functional requirements and compliance outputs.

PRD/API Mapping:
- RP-02, RP-03, RP-04

Scope:
- Ensure OCOB exports match target structure for CSV/Excel/PDF.
- Add historical trend filters across years/programs/wards/education levels.
- Include reviewer and AI fields in ward export outputs where required.

Primary Files:
- `apps/api/modules/reporting/*`
- `apps/web/app/(admin)/county/reports/*`
- `apps/web/app/(admin)/ward/reports/*`

Tests:
- API report contract tests with fixtures.
- Export content validation snapshots.
- UI tests for filter combinations and empty states.

Validation Commands:
- `pnpm --filter @smart-bursary/api run build`
- `pnpm --filter @smart-bursary/api exec jest --config jest.config.ts test/integration/disbursement-reporting.e2e-spec.ts`
- `pnpm --filter @smart-bursary/web run typecheck`
- `pnpm --filter @smart-bursary/web run build`

Exit Criteria:
- Reporting requirements satisfy PRD acceptance intent with verified outputs.

---

## Phase 6 - Frontend Hardening (W6)

Goal: Complete frontend hardening and quality gates.

PRD/Testing Mapping:
- Non-functional: accessibility, responsiveness, quality
- Testing strategy section 20 and section 21

Scope:
- Unit/component test expansion for critical flows.
- E2E suites for student submit, ward review, county allocation, reporting exports.
- Accessibility checks (WCAG 2.1 AA baseline) and low-bandwidth UX checks.

Deliverables:
- Deterministic CI-ready test suites.
- Frontend quality gate thresholds documented.

Validation Gates:
- Stable test pass across repeated runs.
- No high-severity accessibility findings in critical flows.

Exit Criteria:
- W6 marked Completed in web tracker with evidence.

---

## Phase 7 - Backend Hardening and Release Readiness (P7)

Goal: Complete backend release hardening and operational readiness.

PRD/System Design Mapping:
- Non-functional security, availability, performance, observability
- Testing strategy sections 17 to 23

Scope:
- Security hardening: RLS regression tests, auth abuse tests, dependency scanning, secret checks.
- Reliability hardening: retry policies, idempotency checks, dead-letter handling.
- Performance hardening: P95 API target validation and query optimization.
- Observability hardening: structured logs, health endpoints, metrics, alert baselines.

Deliverables:
- Security and reliability test packs.
- Load test report and remediation list.
- Release runbook/checklist.

Validation Gates:
- Build and full integration suite green.
- No critical security vulnerabilities.
- Performance targets met or accepted exceptions documented.

Exit Criteria:
- P7 marked Completed in API tracker with full evidence.

---

## Phase 0 Addendum (Discovered During Traceability)

The PRD traceability pass surfaced additional required slices that must be scheduled explicitly to close all functional gaps.

### Phase 2A - Profile and Submission Gating Core

Goal:
- Implement profile APIs and enforce profile/email/phone completeness before submission.

Scope:
- Implement `apps/api/modules/profile/*` endpoints and services.
- Add submission gate checks in `application.service.ts` for required verification/completeness.
- Add DB constraint migration for county-level national ID uniqueness.

Exit Criteria:
- Submission blocked when profile/email/phone requirements are not met.
- National ID uniqueness per county enforced at DB level.

Current phase notes:
- Implemented `apps/api/modules/profile` endpoints and services:
  - `GET /profile`
  - `PATCH /profile/personal`
  - `PATCH /profile/academic`
  - `PATCH /profile/family`
  - `GET /profile/completion`
- Added submit-time profile readiness gate in `application-submission.service.ts` with semantic `PROFILE_INCOMPLETE` errors.
- Added migration `apps/api/prisma/migrations/20260417113000_phase2a_profile_national_id_unique/migration.sql` and Prisma model uniqueness:
  - `@@unique([countyId, nationalId], map: "idx_profile_county_national_id_unique")`
- Added integration coverage in:
  - `apps/api/test/integration/profile-gating.e2e-spec.ts`
  - `apps/api/test/integration/student-application.helpers.ts` (refactor for file-size governance)
- Validation completed:
  - `pnpm --filter @smart-bursary/api run build`
  - `pnpm --filter @smart-bursary/api exec prisma migrate deploy`
  - `pnpm --filter @smart-bursary/api exec jest --config jest.config.ts test/integration/student-application.e2e-spec.ts test/integration/program-lifecycle.e2e-spec.ts test/integration/program-eligibility.e2e-spec.ts test/integration/profile-gating.e2e-spec.ts`

### Phase 2B - Form Fidelity and Document Storage Completion

Goal:
- Move from HTML preview/download approximation to production PDF and storage behavior.

Scope:
- Produce county-branded PDF outputs for preview/download pathways.
- Shift document persistence from local uploads to S3-compatible storage abstraction.
- Tighten document-type validation to PRD-required types.

Exit Criteria:
- Student receives true PDF outputs before/after submission.
- Document uploads stored in S3-compatible backend and scanned asynchronously.

Current phase notes:
- Converted web PDF endpoints to return real `application/pdf` bytes with Node runtime generation.
- Added shared PDF rendering utilities and payload builders for application and preview flows.
- Added preview PDF API (`POST /api/applications/preview/pdf`) and wired preview page rendering to a server-generated PDF preview.
- Persisted submission-time PDF section snapshots so post-submit download actions reuse the captured application data rather than demo fixtures.
- Implemented S3-only storage adapter with signed URL generation and fail-fast configuration validation.
- Tightened document upload validation:
  - Canonical document type allow-list.
  - MIME allow-list (`application/pdf`, `image/jpeg`, `image/png`).
  - Maximum file size now 5 MB.
- Validation completed:
  - `pnpm --filter @smart-bursary/web run test`
  - `pnpm --filter @smart-bursary/web run typecheck`
  - `pnpm --filter @smart-bursary/web run build`
  - `pnpm --filter @smart-bursary/api run build`
  - `pnpm test -- test/integration/document.e2e-spec.ts test/integration/document-scan-auth.e2e-spec.ts` (run in `apps/api` with local Postgres/Redis up, migrations applied, and seed loaded)

### Phase 2C - AI Trigger Pipeline Completion

Goal:
- Ensure submit event automatically triggers AI scoring workflow.

Scope:
- Add submit-time queue/job trigger for scoring.
- Wire ingest/update lifecycle and failure handling.

Exit Criteria:
- Submission consistently enqueues AI scoring and produces score card lifecycle updates.

### Phase 2D - Notification Integration

Goal:
- Send SMS notifications for required state transitions.

Scope:
- Implement notification module (`sms.service.ts`, wiring, queue hooks).
- Emit notifications from application/review/disbursement transition points.

Exit Criteria:
- Transition events produce SMS jobs and delivery records.

### Phase 4A - Tenant Provisioning and Plan-Tier Gates

Goal:
- Complete tenant provisioning and plan-based feature control.

Scope:
- Implement `tenant.controller.ts`, `tenant.service.ts`, `provisioning.service.ts`.
- Introduce plan-tier feature checks in relevant modules.

Exit Criteria:
- Platform operator can provision county tenants and assign plan tier.
- Restricted features are gated by plan tier.

### Phase 5A - Disbursement Completion

Goal:
- Complete payment execution, retry behavior, and receipt outputs.

Scope:
- Wire actual M-Pesa execution adapter flow.
- Add retry policy (max 3 attempts) and alert path for permanent failure.
- Expose EFT export endpoint and receipt PDF endpoint.

Exit Criteria:
- Disbursement workflow supports execution, retries, and downloadable receipts.

## 6. Cross-Phase Quality Gates (Applies to Every Phase)

1. Architecture boundary checks pass (controller/service/repository separation).
2. No new placeholder routes in touched scope.
3. No unresolved lint/type/test failures in touched apps.
4. Documentation update included for any public contract change.
5. Tracker status updated with evidence before phase close.

## 7. Working Agreement for Execution

1. Start with Phase 0, then execute phases in strict sequence.
2. Use short-lived PRs per phase with no mixed-scope changes.
3. Block merges unless validation commands are green.
4. If a phase uncovers additional missing PRD requirements, add them to the traceability matrix before coding them.

## 8. Immediate Next Action

Continue W6 frontend hardening for Playwright coverage and accessibility checks. Phase 2C remains the next functional slice once execution approval is given.
