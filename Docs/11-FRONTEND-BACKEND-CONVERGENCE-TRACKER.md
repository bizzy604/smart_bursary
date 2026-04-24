# KauntyBursary Frontend-Backend Convergence Tracker

Status: Active (C0 completed; C1 completed; C2 completed; C3 completed; C4 completed; C5 completed; W7a completed; W7b completed; W7c pending)  
Last Updated: 2026-04-24  
Owner: Engineering Team  
Source Inputs: `Docs/01-PRD.md`, `Docs/04-API-DESIGN.md`, `Docs/08-IMPLEMENTATION-PLAN.md`, `Docs/09-PRD-TRACEABILITY-MATRIX.md`, frontend/backend audit run dated 2026-04-18

## Purpose

This document is the single source of truth for closing the frontend-runtime integration gaps identified after W6 and P7 closure.

Use this file to track:
- Current phase and status
- Scope by persona
- Validation evidence
- Completion gates

For this plan, do not track status in multiple docs. Keep execution status here and link out only for supporting evidence.

## Baseline Verdict (2026-04-18)

| Audit Question | Verdict | Notes |
|---|---|---|
| Functional requirements implemented in backend | Yes (mostly complete) | Backend controllers/services and regression gates are present and passing. |
| Functional requirements visible in frontend for all personas | No | Multiple persona surfaces still read static fixtures or placeholders. |
| Frontend to backend fully connected for core flows | No | Student submit/runtime queue and ops/ward/county data surfaces are not fully API-wired. |
| Mock data removed from runtime frontend | No | `student-data`, `admin-data`, and `ops-data` are still used by runtime route files. |

## Scope Boundaries

In scope:
- Student persona runtime wiring (program discovery, profile surfaces, submit pipeline)
- Ward and county operational queue/review/disbursement runtime wiring
- Platform operator runtime wiring (tenants and health)
- County settings runtime completion for users and wards pages
- Traceability and tracker status reconciliation after implementation

Out of scope:
- New product features beyond PRD/API alignment
- Additional backend hardening tracks already completed in P7 unless required by this plan

## Delivery Rules

1. Work one phase at a time.
2. Do not start the next phase until the current phase is implemented, validated, and marked Completed here.
3. Validation must include build, test, and edge-case checks for touched slices.
4. If validation fails, remain in the current phase and record blockers in this document.

## Phase Board

| Phase | Name | Status | Depends On | Exit Gate |
|---|---|---|---|---|
| C0 | Baseline Audit and Plan Lock | Completed | None | Baseline verdict and scope frozen in this tracker |
| C1 | Student Runtime API Wiring | Completed | C0 | Student routes no longer depend on fixture-only runtime data paths |
| C2 | Ward and County Workflow API Wiring | Completed | C1 | Queue/review/disbursement runtime routes are API-driven |
| C3 | Ops Runtime API Wiring | Completed | C2 | Tenants/health runtime routes are API-driven |
| C4 | County Settings Users/Wards Completion | Completed | C3 | Users/wards settings routes are implemented (not placeholders) |
| C5 | Traceability Reconciliation and Final Gates | Completed | C4 | PRD matrix and trackers reflect validated runtime truth |
| W7a | UI Modernization - Foundation (shadcn init, token coexistence, DataTable primitives) | Completed (2026-04-24) | C5 | `components.json` authored, shadcn primitives scaffolded, DataTable renders; web typecheck/test/build green; tenant branding unchanged |
| W7b | UI Modernization - DataTable Rollout to 4 Role Dashboards | Completed (2026-04-24) | W7a | All four role dashboards render runtime API data via `<DataTable>`; typecheck/unit/build green; e2e selectors preserved |
| W7c | UI Modernization - Full Overhaul (nav, layouts, typography, theming, feature surfaces) | Pending | W7b | Redesigned shell + feature pages; visual regression approved; Lighthouse + a11y + low-bandwidth checks pass |

## Phase Detail and Checklists

### C0 - Baseline Audit and Plan Lock

Status: Completed

Checklist:
- [x] Baseline verdict captured.
- [x] Scope and out-of-scope boundaries captured.
- [x] Strict phase order defined.

Validation Evidence:
- 2026-04-18: frontend/backend audit completed and summarized in this tracker.

---

### C1 - Student Runtime API Wiring

Status: Completed

Checklist:
- [x] Replace runtime fixture dependencies from student-facing routes/hook surfaces.
- [x] Replace local-only submit flow with backend-backed draft/section/submit flow.
- [x] Ensure student applications/timeline surfaces reflect backend state.
- [x] Preserve PDF preview/download behavior while using backend-backed application data.

Validation:
- [x] `pnpm --filter @smart-bursary/web run test`
- [x] `pnpm --filter @smart-bursary/web run typecheck`
- [x] `pnpm --filter @smart-bursary/web run build`
- [x] Student submit + export critical e2e path passes.
- [x] Runtime route scan confirms no fixture-only student data imports remain where backend data is expected.

Blockers:
- None logged.

---

### C2 - Ward and County Workflow API Wiring

Status: Completed

Checklist:
- [x] Replace ward queue/detail surfaces currently fed by static admin fixtures.
- [x] Replace county review/disbursement queue surfaces currently fed by static admin fixtures.
- [x] Keep county dashboard API-driven with no static queue fallback for critical operational data.

Validation:
- [x] `pnpm --filter @smart-bursary/web run test`
- [x] `pnpm --filter @smart-bursary/web run typecheck`
- [x] `pnpm --filter @smart-bursary/web run build`
- [x] Targeted API integration tests for review/disbursement contracts pass when touched.
- [x] Runtime route scan confirms no fixture-only admin queue imports remain on these routes.

Blockers:
- None logged.

---

### C3 - Ops Runtime API Wiring

Status: Completed

Checklist:
- [x] Replace ops tenants list/detail fixture reads with API-backed data.
- [x] Replace ops health snapshot fixture reads with API-backed data source.
- [x] Preserve existing role and access assumptions for platform-operator surfaces.

Validation:
- [x] `pnpm --filter @smart-bursary/web run test`
- [x] `pnpm --filter @smart-bursary/web run typecheck`
- [x] `pnpm --filter @smart-bursary/web run build`
- [x] Targeted API contract tests for tenant provisioning/list/detail flows pass when touched.
- [x] Runtime route scan confirms no fixture-only ops imports remain on these routes.

Blockers:
- None logged.

---

### C4 - County Settings Users/Wards Completion

Status: Completed

Checklist:
- [x] Replace users settings placeholder route with functional implementation.
- [x] Replace wards settings placeholder route with functional implementation.
- [x] Ensure settings behaviors are county-scoped and role-protected.

Validation:
- [x] `pnpm --filter @smart-bursary/web run test`
- [x] `pnpm --filter @smart-bursary/web run typecheck`
- [x] `pnpm --filter @smart-bursary/web run build`
- [x] Targeted API tests pass for newly used settings endpoints.

Blockers:
- None logged.

---

### C5 - Traceability Reconciliation and Final Gates

Status: Completed

Checklist:
- [x] Update `Docs/09-PRD-TRACEABILITY-MATRIX.md` statuses/evidence to match validated runtime behavior.
- [x] Update implementation trackers with final completion state for this plan.
- [x] Re-run release-grade quality gates for touched surfaces.
- [x] Confirm no runtime persona-critical route is mock-data-backed.

Validation:
- [x] `pnpm --filter @smart-bursary/web run test`
- [x] `pnpm --filter @smart-bursary/web run test:e2e`
- [x] `pnpm --filter @smart-bursary/web run test:a11y`
- [x] `pnpm --filter @smart-bursary/web run typecheck`
- [x] `pnpm --filter @smart-bursary/web run build`
- [x] `pnpm --filter @smart-bursary/api run build`
- [x] `pnpm --filter @smart-bursary/api run test -- --runInBand`

Blockers:
- None logged.

## Evidence Log

| Date | Phase | Update | Validation Evidence |
|---|---|---|---|
| 2026-04-18 | C0 | Baseline verdict and phase board initialized | Audit evidence captured across runtime web routes and existing API controllers/tests |
| 2026-04-18 | C1 | Student submit critical flow E2E stabilized with endpoint-exact API mocks aligned to backend-driven runtime | `pnpm --filter @smart-bursary/web run typecheck` pass; `pnpm --filter @smart-bursary/web run test:e2e -- student-submit.spec.ts` pass; route scan: no `@/lib/student-data` imports under `apps/web/app/(student)` and `apps/web/hooks` |
| 2026-04-18 | C1 | C1 validation gate closed and phase marked complete | `pnpm --filter @smart-bursary/web run test` pass; `pnpm --filter @smart-bursary/web run build` pass |
| 2026-04-18 | C2 | Ward/county workflow runtime wiring validated and C2 gate closed | `pnpm --filter @smart-bursary/web run typecheck` pass; `pnpm --filter @smart-bursary/web run test` pass (21 tests); `pnpm --filter @smart-bursary/web run build` pass; `pnpm --filter @smart-bursary/web run test:e2e -- ward-review.spec.ts county-allocation.spec.ts` pass (2 tests); route scan: no `@/lib/admin-data` imports under `apps/web/app/(admin)/ward` and `apps/web/app/(admin)/county` |
| 2026-04-18 | C3 | Ops tenant/health runtime routes migrated to platform APIs and C3 gate closed | `pnpm --filter @smart-bursary/web run typecheck` pass; `pnpm --filter @smart-bursary/web run test` pass (21 tests); `pnpm --filter @smart-bursary/web run build` pass; `pnpm --filter @smart-bursary/web run test:e2e -- ops-runtime.spec.ts` pass (2 tests); `pnpm --filter @smart-bursary/api run test -- --runInBand test/integration/tenant-provisioning-plan-gates.e2e-spec.ts` pass (5 tests); route scan: no `@/lib/ops-data` imports under `apps/web/app/(ops)` |
| 2026-04-19 | C4 | Settings users/wards placeholders replaced by county-scoped runtime analytics pages and C4 gate closed | `pnpm --filter @smart-bursary/web run typecheck` pass; `pnpm --filter @smart-bursary/web run test` pass (23 tests); `pnpm --filter @smart-bursary/web run build` pass; targeted coverage: `app/(admin)/settings/users/page.test.tsx` and `app/(admin)/settings/wards/page.test.tsx` |
| 2026-04-19 | C5 | Traceability reconciled and release-grade gate suite revalidated; plan closed | `pnpm --filter @smart-bursary/web run test` pass (23 tests); `pnpm --filter @smart-bursary/web run test:e2e` pass (14 tests); `pnpm --filter @smart-bursary/web run test:a11y` pass (7 tests); `pnpm --filter @smart-bursary/web run typecheck` pass; `pnpm --filter @smart-bursary/web run build` pass; `pnpm --filter @smart-bursary/api run build` pass; `pnpm --filter @smart-bursary/api run test -- --runInBand` pass (24 suites / 97 tests); route scan: no `@/lib/student-data`, `@/lib/admin-data`, `@/lib/ops-data` imports under `apps/web/app` |

## Change Log

- 2026-04-18: Document created as canonical tracker for frontend-backend convergence plan.
- 2026-04-18: Updated C1 status to In Progress with latest validation evidence from student submit/runtime integration and critical E2E pass.
- 2026-04-18: Closed C1 after full validation and advanced active execution to C2.
- 2026-04-18: Closed C2 after ward/county API wiring, E2E mock alignment, and full web validation gates passed.
- 2026-04-18: Closed C3 after replacing ops fixture-backed tenants/health routes with API-driven runtime pages and passing targeted web/API validations.
- 2026-04-19: Closed C4 by implementing county-scoped users/wards settings runtime pages and validating with web gates plus new page tests.
- 2026-04-19: Advanced active execution to C5 (traceability reconciliation and final release-grade gates).
- 2026-04-19: Closed C5 after full release-grade web/API validation and traceability reconciliation.