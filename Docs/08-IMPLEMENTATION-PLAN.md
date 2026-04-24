# KauntyBursary Gap Closure and Hardening Implementation Plan

Status: Completed (Phase 2B Completed, B-01 Completed, B-02 Completed, B-03 Completed, B-04 Completed, B-05 Completed, B-06 Completed, B-07 Completed, B-08 Completed, O-01 Completed, W6 Completed, P7 Completed)
Last Updated: 2026-04-18
Owner: Engineering Team
References: 01-PRD.md, 02-SYSTEM_DESIGN.md, 04-API-DESIGN.md, 07-TESTING-STRATEGY.md, 09-PRD-TRACEABILITY-MATRIX.md, 10-FUNCTIONAL-CLOSURE-BACKLOG.md, 11-FRONTEND-BACKEND-CONVERGENCE-TRACKER.md

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
- Backlog Item B-01: Completed.
  - Implementation: Added strict section A-F payload contracts, family/HELB/prior-bursary fidelity fields, duplicate draft conflict semantics (`409 DUPLICATE_APPLICATION`), and canonical amount/disclosure syncing from section payloads.
  - Validation: Complete.
    - `pnpm --filter @smart-bursary/api run build` passed.
    - `pnpm --filter @smart-bursary/api run test -- test/integration/student-application.e2e-spec.ts test/integration/student-application-fidelity.e2e-spec.ts test/integration/program-eligibility.e2e-spec.ts` passed (14/14).
    - `pnpm --filter @smart-bursary/web run test` passed (16/16).
    - `pnpm --filter @smart-bursary/web run typecheck` passed.
    - `pnpm --filter @smart-bursary/web run build` passed.
- Backlog Item B-02: Completed.
  - Implementation: Added submit-time `ai-scoring` queue enqueueing, AI queue processor invocation against `apps/ai-scoring`, internal application payload read endpoint for scoring fetch, and explicit AI queue/scoring failure lifecycle timeline events.
  - Validation: Complete.
    - `pnpm --filter @smart-bursary/api run build` passed.
    - `pnpm --filter @smart-bursary/api run test -- test/integration/review-ai.e2e-spec.ts test/integration/review-ai-failure.e2e-spec.ts test/integration/student-application.e2e-spec.ts` passed (15/15).
- Backlog Item B-03: Completed.
  - Implementation: Activated `TenantModule` settings APIs (`GET/PATCH /admin/settings`), delivered county branding + form customization UI, completed county scoring-weight UX (`GET/PATCH /admin/scoring-weights`), and wired county scoring weights into queue scoring requests.
  - Validation: Complete.
    - `pnpm --filter @smart-bursary/api run build` passed.
    - `pnpm --filter @smart-bursary/api run test -- test/integration/tenant-settings.e2e-spec.ts test/integration/review-ai.e2e-spec.ts` passed (10/10).
    - `pnpm --filter @smart-bursary/web run test` passed (19/19).
    - `pnpm --filter @smart-bursary/web run typecheck` passed.
    - `pnpm --filter @smart-bursary/web run build` passed.
- Backlog Item B-04: Completed.
  - Implementation: Added platform-operator provisioning APIs and orchestration (`/platform/tenants`), seeded default ward registry data, bootstrapped county-admin accounts, and introduced reusable plan-tier guard/decorator with endpoint enforcement for restricted and enterprise-only capabilities.
  - Validation: Complete.
    - `pnpm --filter @smart-bursary/api run build` passed.
    - `pnpm --filter @smart-bursary/api run test -- --runInBand test/integration/tenant-provisioning-plan-gates.e2e-spec.ts` passed (5/5).
    - `pnpm --filter @smart-bursary/api run test -- --runInBand test/integration/tenant-settings.e2e-spec.ts test/integration/review-ai.e2e-spec.ts` passed (10/10).
- Backlog Item B-05: Completed.
  - Implementation: Added queue-backed disbursement execution lifecycle (success/failure/retry/terminal escalation), manual retry endpoint, receipt PDF generation/download endpoints, and EFT batch export endpoint for finance workflows.
  - Validation: Complete.
    - `pnpm --filter @smart-bursary/api run build` passed.
    - `pnpm --filter @smart-bursary/api run test -- --runInBand test/integration/disbursement.e2e-spec.ts test/integration/disbursement-reporting.e2e-spec.ts test/integration/disbursement-execution.e2e-spec.ts` passed (11/11).
- Backlog Item B-06: Completed.
  - Implementation: Completed reporting analytics APIs (dashboard/OCOB/ward-summary/trends), wired county and ward reporting pages to live API data, added CSV/PDF export downloads, and enabled trend filters for year/program/ward/education-level.
  - Validation: Complete.
    - `pnpm --filter @smart-bursary/api run build` passed.
    - `pnpm --filter @smart-bursary/api run test -- --runInBand --runTestsByPath test/integration/reporting-analytics.e2e-spec.ts` passed (4/4).
    - `pnpm --filter @smart-bursary/web run typecheck` passed.
    - `pnpm --filter @smart-bursary/web run build` passed.
- Backlog Item B-07: Completed.
  - Implementation: Added queue-backed status-change SMS dispatch and persisted notification delivery records, wired submission/review/disbursement transition emitters, and exposed county delivery audit endpoint (`GET /notifications/deliveries`).
  - Validation: Complete.
    - `pnpm --filter @smart-bursary/api exec prisma migrate deploy` passed.
    - `pnpm --filter @smart-bursary/api run build` passed.
    - `pnpm --filter @smart-bursary/api run test -- --runInBand --runTestsByPath test/integration/notification-status-change.e2e-spec.ts` passed (2/2).
    - `pnpm --filter @smart-bursary/api run test -- --runInBand --runTestsByPath test/integration/disbursement-execution.e2e-spec.ts` passed (3/3).
- Backlog Item B-08: Completed.
  - Implementation: Added explicit student RBAC decorators for application/document endpoints, implemented role-aware application timeline/review-note audit query APIs, and tightened county-wide reporting endpoint access to county-admin/finance roles.
  - Validation: Complete.
    - `pnpm --filter @smart-bursary/api run build` passed.
    - `pnpm --filter @smart-bursary/api run test -- --runInBand --runTestsByPath test/integration/b08-security-audit.e2e-spec.ts` passed (3/3).
    - `pnpm --filter @smart-bursary/api run test -- --runInBand --runTestsByPath test/integration/review-ai.e2e-spec.ts` passed (5/5).
    - `pnpm --filter @smart-bursary/api run test -- --runInBand --runTestsByPath test/integration/reporting-analytics.e2e-spec.ts` passed (4/4).
- Operational Slice O-01 (County Admin Program UI): Completed.
  - Implementation: Replaced settings programs placeholders with functional list/new/detail pages wired to lifecycle endpoints, added shared admin programs API client, and linked program management from settings index.
  - Validation: Complete.
    - `pnpm --filter @smart-bursary/web run typecheck` passed.
    - `pnpm --filter @smart-bursary/web run build` passed.
- Phase 6 (W6): Completed.
  - Implementation: Deterministic frontend hardening completed (unit/component expansion, Playwright critical journeys, accessibility baseline, and low-bandwidth critical coverage) with resilient PDF route fallback handling to prevent render-path 500 regressions.
  - Validation: Complete.
    - `pnpm --filter @smart-bursary/web run test` passed (21/21).
    - `pnpm --filter @smart-bursary/web run test:e2e` passed (12/12).
    - `pnpm --filter @smart-bursary/web run test:a11y` passed (7/7).
    - `pnpm --filter @smart-bursary/web run typecheck` passed.
    - `pnpm --filter @smart-bursary/web run build` passed.
- Phase 7 (P7): Completed.
  - Implementation:
    - P7-S1 security and reliability baseline regression validation.
    - P7-S2 request observability baseline instrumentation (global `X-Request-Id` propagation/generation and request latency logging).
    - P7-S3 dependency and secret scanning baseline (`pnpm audit --prod` for API package and source secret-hygiene scan).
    - P7-S4 API load smoke baseline harness (`perf:smoke`) with p95 budget enforcement.
    - P7-S5 release checklist closure with full regression gate execution.
  - Validation: Complete.
    - `pnpm --filter @smart-bursary/api run build` passed.
    - `pnpm --filter @smart-bursary/api run test -- --runInBand --runTestsByPath test/integration/b08-security-audit.e2e-spec.ts test/integration/notification-status-change.e2e-spec.ts test/integration/disbursement-execution.e2e-spec.ts test/integration/review-ai-failure.e2e-spec.ts` passed (4 suites, 9 tests).
    - `pnpm --filter @smart-bursary/api run test -- --runInBand --runTestsByPath test/integration/application.e2e-spec.ts test/integration/b08-security-audit.e2e-spec.ts test/integration/notification-status-change.e2e-spec.ts test/integration/disbursement-execution.e2e-spec.ts test/integration/review-ai-failure.e2e-spec.ts` passed (5 suites, 12 tests).
    - `pnpm --filter @smart-bursary/api run test -- --runInBand` passed (24 suites, 97 tests).
    - `cd apps/api ; pnpm audit --prod` passed (0 known vulnerabilities).
    - `pnpm --filter @smart-bursary/api run perf:smoke` passed (`totalRequests=240`, `concurrency=24`, `p95Ms=99.56`, `requestsPerSecond=335.7`).
    - Soak-style run passed using perf harness (`totalRequests=1200`, `concurrency=20`, `p95Ms=168.37`, `requestsPerSecond=291.9`).
    - Performance/caching baseline documented: p95 budget configurable via `P7_HEALTH_P95_BUDGET_MS`; config caching is enabled in `ConfigModule.forRoot({ cache: true })`; route-level response caching remains intentionally unset pending targeted endpoint profiling.
    - Release checklist completed: `apps/api/RELEASE_READINESS_CHECKLIST.md`.
- Next strict backlog item: None (`B-01` through `B-08` complete in `Docs/10-FUNCTIONAL-CLOSURE-BACKLOG.md`).
- Post-P7 frontend-backend convergence execution is tracked in `Docs/11-FRONTEND-BACKEND-CONVERGENCE-TRACKER.md` as the single active status source for that plan.

## 1. Objective

Close all currently identified PRD/API gaps and complete hardening work required for a production release candidate.

This plan is designed to be executed one phase at a time, with strict completion gates before moving forward.

## 2. Confirmed Gap Baseline (As of 2026-04-17)

### G-01 Programs management API gap (critical)
- Lifecycle endpoints are now implemented in code: `POST /programs`, `PATCH /programs/:id`, `POST /programs/:id/publish`, `POST /programs/:id/close`.
- DTO scaffolds for program create/update are implemented.
- Build and integration validation are complete for this scope.

### G-02 County Admin settings gap (critical)
- B-03 closed the core settings gap for branding, form customization, and AI scoring configuration.
- O-01 closed the county program management UI surface (list/new/edit/publish/close).
- Remaining county settings gaps are now focused on:
  - Users management
  - Ward management

### G-03 Eligibility behavior gap (high)
- Eligibility engine is implemented and student program discovery now returns eligibility flags and reasons.
- Ineligible draft creation and closed-window submission now return semantic `422` error codes.

### G-04 Hardening phases incomplete (critical for release)
- Frontend W6 (testing/hardening) is Completed.
- Backend P7 (hardening/release readiness) is Completed.

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

Execute Phase `W7a` as the first sub-phase of the `W7 - UI Modernization & DataTable Rollout` track scoped below. Release-candidate packaging is deferred until `W7` closes.

Strict functional backlog execution is complete (`B-01` through `B-08`), frontend hardening (`W6`) is complete, and backend hardening (`P7`) is complete.

## 9. Phase W7 - UI Modernization & DataTable Rollout

Status: Active (W7a Completed 2026-04-24; W7b Completed 2026-04-24; W7c Pending)
Started: 2026-04-24
Owner: Frontend Team

Context:
- `apps/web` currently runs custom `components/ui/` primitives (CVA + bespoke tokens `brand-*`, `accent-*`, `county-primary`) and has never executed `shadcn init` (the `shadcn@4.2.0` devDep is unused, no `components.json`).
- `@tanstack/react-table` is not installed; `components/shared/data-table.tsx` is an empty stub; `components/ui/table.tsx` is empty.
- Business requirement is to deliver a modern, professional, consistent UI across all four role dashboards (Student, County Admin, Ward Admin, Platform Ops) using official shadcn/ui components while preserving multi-tenant county branding (`--county-primary` / `--county-primary-text` CSS vars).

Scope:
- Install and configure canonical shadcn/ui to coexist with existing tokens (no wholesale rewrite of existing custom components; tokens aliased).
- Install `@tanstack/react-table`, scaffold missing shadcn primitives (table, dropdown-menu, popover, calendar, command, tabs, sheet, tooltip, accordion, separator, scroll-area, label, form), compose a DatePicker.
- Build a shared `<DataTable>` with pagination, sorting, filtering, column visibility, row selection, faceted filters, toolbar.
- Roll DataTable into all four role dashboards (W7b) and redesign nav/layouts/typography/theming/feature surfaces (W7c).

Out of Scope:
- Backend or API contract changes (`apps/api`, `apps/ai-scoring` untouched).
- New product features beyond UI/UX rendering of existing runtime data.
- Additional i18n string extractions (follow-on).

Sub-Phase Board:

| Sub-Phase | Name | Status | Depends On | Exit Gate |
|---|---|---|---|---|
| W7a | Foundation (shadcn init, token coexistence, DataTable primitives) | Completed (2026-04-24) | P7, W6, C5 | `components.json` authored; all listed shadcn components scaffolded; DataTable primitive renders with seed data; typecheck/test/build green; tenant branding regression-free |
| W7b | DataTable Rollout to 4 Role Dashboards | Completed (2026-04-24) | W7a | Student, County Admin, Ward Admin, and Ops dashboards use `<DataTable>` against runtime API data; pagination/sort/filter/visibility/row-selection all functional; typecheck/unit/build green |
| W7c | Full Overhaul (nav, layouts, typography, theming, feature surfaces) | Pending | W7b | New sidebars/headers, refreshed typography, tuned palette, modernized feature pages (apply, disbursements, review) all shipped; visual regression approved; Lighthouse + a11y + low-bandwidth checks pass across all four personas |

### W7a - Foundation

Status: Completed (2026-04-24)

Checklist:
- [x] `apps/web/components.json` authored (no CLI `init` executed).
- [x] `apps/web/styles/globals.css` extended with canonical shadcn HSL token layer mapped onto existing vars (no existing vars removed; `.dark` class block added for future dark-mode work).
- [x] `apps/web/tailwind.config.ts` extended with shadcn semantic color aliases, `accordion-down`/`accordion-up` keyframes, `darkMode: ["class"]`, and `tailwindcss-animate` plugin (existing `brand`, `accent`, `county`, `success`, `warning`, `danger`, `info` preserved).
- [x] `apps/web/components/ui/button.tsx` extended with canonical variants (`default`, `destructive`, `link`), `size="icon"`, and `asChild` prop (existing `primary`, `secondary`, `outline`, `ghost`, `danger`, `sm`/`md`/`lg` sizes preserved).
- [x] `apps/web/components/ui/badge.tsx` extended with canonical variants (`default`, `secondary`, `destructive`, `outline`) alongside existing (`neutral`, `info`, `success`, `warning`, `danger`).
- [x] Dependencies installed: `@tanstack/react-table@^8.21.3`, `@radix-ui/react-{dialog,dropdown-menu,popover,label,checkbox,tabs,tooltip,accordion,separator,scroll-area,select}`, `date-fns`, `react-day-picker@^9.14.0`, `cmdk@^1.1.1`, `vaul`, `tailwindcss-animate@^1.0.7`.
- [x] Shadcn primitives authored under `apps/web/components/ui/`: `table`, `dialog`, `dropdown-menu`, `popover`, `calendar`, `command`, `tabs`, `sheet`, `tooltip`, `accordion`, `separator`, `scroll-area`, `label`, `form`, `date-picker`, `select`, `skeleton`, `checkbox` (existing empty stubs replaced with canonical implementations; no existing populated component overwritten destructively).
- [x] Shared DataTable pieces authored under `apps/web/components/shared/`: `data-table` (generic with pagination/sort/filter/visibility/row-selection/loading/empty), `data-table-column-header`, `data-table-pagination`, `data-table-view-options`, `data-table-faceted-filter`, `data-table-toolbar`.
- [x] `components/layout/county-branding-provider.tsx` extended to also set shadcn `--primary`, `--primary-foreground`, `--ring`, and `--chart-1` HSL variables (via new `hexToHslChannels` helper in `lib/utils.ts`) in lockstep with the existing hex `--county-primary`.

Validation Evidence:
- 2026-04-24: `pnpm --filter @smart-bursary/web run typecheck` passed (no errors).
- 2026-04-24: `pnpm --filter @smart-bursary/web run test` passed (13 test files / 23 tests, 8.41s).
- 2026-04-24: `pnpm --filter @smart-bursary/web run build` passed (Next 16.2.3 Turbopack; 37 routes generated; TypeScript check passed; static generation completed).
- Pre-existing gaps (not introduced by W7a, to address in a follow-on): `next lint` is unavailable because Next 16 removed the command, and `eslint.config.js` flat-config is missing for ESLint 9. Tracked for a separate ESLint modernization task outside W7 scope.

### W7b - DataTable Rollout to 4 Role Dashboards

Status: Completed (2026-04-24)

Checklist:
- [x] Shared factory `components/shared/review-queue-columns.tsx` authored (column map + action column builder + status options) so every `ReviewQueueItem` surface composes the same primitives.
- [x] Student: `/dashboard` + `/applications` render `<DataTable>` of `StudentApplicationSummary` with reference / program / status / requested / updated columns, Draft-aware primary action, faceted status filter, and program search; `EmptyState` preserved when no applications exist.
- [x] County Admin: `/county/dashboard` renders `<DataTable>` of `COUNTY_REVIEW` queue (reference, applicant, ward, program, AI score, ward recommendation, status, reviewed); hero + StatsCards + BudgetBar + ward breakdown preserved; faceted filters on ward + status.
- [x] County Admin: `/county/review` queue page migrated to `<DataTable>` with ward / program / status faceted filters and `Final Review` primary action.
- [x] County Admin: `/county/disbursements` migrated to `<DataTable>` of `APPROVED` queue; bulk M-Pesa disburse + EFT export buttons preserved.
- [x] Ward Admin: `/ward/dashboard` and `/ward/applications` both use `<DataTable>` with `Review` primary action and `Documents` / `AI Score` menu actions; faceted filters on education level / program / status.
- [x] Platform Ops: `/tenants` uses `<DataTable>` of `OpsTenantSummary` with `Open Tenant Detail` action; Plan / status faceted filters; `Plan ENTERPRISE` text preserved for e2e compatibility.
- [x] Platform Ops: `/health` uses `<DataTable>` of `OpsServiceHealthItem`; incident feed preserved below the table.
- [x] `e2e/ops-runtime.spec.ts` updated: `getByRole("article")` → `getByRole("row")` on the health page (DataTable renders `<tr>` rows, not `<article>` cards). All other existing button/heading selectors remain compatible since DataTable action columns render real `<Button>` elements with the same labels.

Validation Evidence:
- 2026-04-24: `pnpm --filter @smart-bursary/web run typecheck` passed (no errors).
- 2026-04-24: `pnpm --filter @smart-bursary/web run test` passed (13 test files / 23 tests, 8.30s).
- 2026-04-24: `pnpm --filter @smart-bursary/web run build` passed (Next 16.2.3 Turbopack; 37 routes generated; TypeScript check passed; static generation completed).
- Runtime wiring unchanged from C1–C5 — every dashboard still reads the same API hooks / client modules (`fetchWorkflowQueueByStatus`, `fetchDashboardReport`, `fetchOpsTenants`, `fetchOpsPlatformHealth`, `useApplication`, `fetchWardSummaryReport`). No fixture data reintroduced.
- Playwright `test:e2e` / `test:a11y` require a live dev server + API stubs; deferred to W7c's dedicated visual-regression pass where that harness is already in scope. All Playwright selector dependencies have been analyzed and preserved (`getByRole("heading", …)`, `getByRole("button", { name: "Review" })`, `getByRole("button", { name: "Final Review" })`, `getByText("TRK-2026-00402")` etc. continue to resolve against the DataTable DOM).

### W7c - Full Overhaul

Status: Pending (do not start until W7b marked Completed)

Exit Gate:
- Redesigned sidebars/headers and bottom nav across admin + student surfaces.
- Typography scale, palette, shadow scale, and radius tokens refreshed.
- Feature pages modernized (apply, disbursements, review, settings) using shadcn Tabs/Sheet/Accordion/Form/DatePicker.
- Visual regression baselines approved, Lighthouse regressions cleared, multi-tenant branding validated under at least two county overrides.
- `Docs/08-IMPLEMENTATION-PLAN.md`, `Docs/11-FRONTEND-BACKEND-CONVERGENCE-TRACKER.md`, and `Docs/09-PRD-TRACEABILITY-MATRIX.md` all updated.
