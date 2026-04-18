# KauntyBursary Frontend-Backend Convergence Tracker

Status: Active (C0 completed; C1 completed; C2 completed)  
Last Updated: 2026-04-18  
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
| C3 | Ops Runtime API Wiring | Not Started | C2 | Tenants/health runtime routes are API-driven |
| C4 | County Settings Users/Wards Completion | Not Started | C3 | Users/wards settings routes are implemented (not placeholders) |
| C5 | Traceability Reconciliation and Final Gates | Not Started | C4 | PRD matrix and trackers reflect validated runtime truth |

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

Status: Not Started

Checklist:
- [ ] Replace ops tenants list/detail fixture reads with API-backed data.
- [ ] Replace ops health snapshot fixture reads with API-backed data source.
- [ ] Preserve existing role and access assumptions for platform-operator surfaces.

Validation:
- [ ] `pnpm --filter @smart-bursary/web run test`
- [ ] `pnpm --filter @smart-bursary/web run typecheck`
- [ ] `pnpm --filter @smart-bursary/web run build`
- [ ] Targeted API contract tests for tenant provisioning/list/detail flows pass when touched.
- [ ] Runtime route scan confirms no fixture-only ops imports remain on these routes.

Blockers:
- None logged.

---

### C4 - County Settings Users/Wards Completion

Status: Not Started

Checklist:
- [ ] Replace users settings placeholder route with functional implementation.
- [ ] Replace wards settings placeholder route with functional implementation.
- [ ] Ensure settings behaviors are county-scoped and role-protected.

Validation:
- [ ] `pnpm --filter @smart-bursary/web run test`
- [ ] `pnpm --filter @smart-bursary/web run typecheck`
- [ ] `pnpm --filter @smart-bursary/web run build`
- [ ] Targeted API tests pass for newly used settings endpoints.

Blockers:
- None logged.

---

### C5 - Traceability Reconciliation and Final Gates

Status: Not Started

Checklist:
- [ ] Update `Docs/09-PRD-TRACEABILITY-MATRIX.md` statuses/evidence to match validated runtime behavior.
- [ ] Update implementation trackers with final completion state for this plan.
- [ ] Re-run release-grade quality gates for touched surfaces.
- [ ] Confirm no runtime persona-critical route is mock-data-backed.

Validation:
- [ ] `pnpm --filter @smart-bursary/web run test`
- [ ] `pnpm --filter @smart-bursary/web run test:e2e`
- [ ] `pnpm --filter @smart-bursary/web run test:a11y`
- [ ] `pnpm --filter @smart-bursary/web run typecheck`
- [ ] `pnpm --filter @smart-bursary/web run build`
- [ ] `pnpm --filter @smart-bursary/api run build`
- [ ] `pnpm --filter @smart-bursary/api run test -- --runInBand`

Blockers:
- None logged.

## Evidence Log

| Date | Phase | Update | Validation Evidence |
|---|---|---|---|
| 2026-04-18 | C0 | Baseline verdict and phase board initialized | Audit evidence captured across runtime web routes and existing API controllers/tests |
| 2026-04-18 | C1 | Student submit critical flow E2E stabilized with endpoint-exact API mocks aligned to backend-driven runtime | `pnpm --filter @smart-bursary/web run typecheck` pass; `pnpm --filter @smart-bursary/web run test:e2e -- student-submit.spec.ts` pass; route scan: no `@/lib/student-data` imports under `apps/web/app/(student)` and `apps/web/hooks` |
| 2026-04-18 | C1 | C1 validation gate closed and phase marked complete | `pnpm --filter @smart-bursary/web run test` pass; `pnpm --filter @smart-bursary/web run build` pass |
| 2026-04-18 | C2 | Ward/county workflow runtime wiring validated and C2 gate closed | `pnpm --filter @smart-bursary/web run typecheck` pass; `pnpm --filter @smart-bursary/web run test` pass (21 tests); `pnpm --filter @smart-bursary/web run build` pass; `pnpm --filter @smart-bursary/web run test:e2e -- ward-review.spec.ts county-allocation.spec.ts` pass (2 tests); route scan: no `@/lib/admin-data` imports under `apps/web/app/(admin)/ward` and `apps/web/app/(admin)/county` |

## Change Log

- 2026-04-18: Document created as canonical tracker for frontend-backend convergence plan.
- 2026-04-18: Updated C1 status to In Progress with latest validation evidence from student submit/runtime integration and critical E2E pass.
- 2026-04-18: Closed C1 after full validation and advanced active execution to C2.
- 2026-04-18: Closed C2 after ward/county API wiring, E2E mock alignment, and full web validation gates passed.