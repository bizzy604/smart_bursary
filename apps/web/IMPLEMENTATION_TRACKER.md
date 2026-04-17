# Frontend Implementation Tracker

Purpose: Track frontend implementation in controlled, validated phases and prevent scope spillover.

## Governance Rules

1. Work one phase at a time.
2. Do not start the next phase until the current phase is fully implemented, validated, and marked Completed in this document.
3. Validation must include build, typecheck, and phase-specific checks.
4. If validation fails or blockers remain, stop and log the gap under the active phase.

## Status Legend

- Not Started
- In Progress
- Blocked
- Completed

---

## Master Roadmap

| Phase | Name | Status | Owner | Start Date | Actual End |
|---|---|---|---|---|---|
| W0 | Foundation and Auth Surface | Completed | GitHub Copilot | 2026-04-16 | 2026-04-16 |
| W1 | Student Portal Core Slice | Completed | GitHub Copilot | 2026-04-16 | 2026-04-16 |
| W2 | Application Wizard (Sections A-F) | Completed | GitHub Copilot | 2026-04-16 | 2026-04-16 |
| W3 | Student Preview and Submission UX | Completed | GitHub Copilot | 2026-04-16 | 2026-04-16 |
| W4 | Ward and County Admin Portals | Completed | GitHub Copilot | 2026-04-17 | 2026-04-17 |
| W5 | Reporting and Operational Screens | Completed | GitHub Copilot | 2026-04-17 | 2026-04-17 |
| W6 | Frontend Testing and Hardening | In Progress | GitHub Copilot | 2026-04-17 | - |

---

## Active Phase Rule

Only one phase may be marked In Progress at any time.

Current active phase: W6 (Frontend Testing and Hardening)

---

## W6 - Frontend Testing and Hardening

Status: In Progress
Owner: GitHub Copilot
Scope Window: 2026-04-17

### In Scope

- Introduce deterministic web unit/component test harness.
- Add critical-flow tests for report generation utilities and document interaction actions.
- Run repeatable frontend quality gates for tests, typecheck, and production build.

### Out of Scope

- Playwright E2E user-journey suites (scheduled as next W6 slice).
- Automated WCAG scanner pipeline integration (scheduled as next W6 slice).

### Deliverables

- [x] Vitest + jsdom harness and scripts added:
	- `apps/web/vitest.config.ts`
	- `apps/web/test/setup.ts`
	- `apps/web/package.json` scripts (`test`, `test:watch`)
- [x] Critical-flow utility tests added:
	- `apps/web/lib/format.test.ts`
	- `apps/web/lib/reporting-data.test.ts`
	- `apps/web/lib/ops-data.test.ts`
- [x] Component interaction test added:
	- `apps/web/components/application/document-viewer.test.tsx`
- [x] Hardening fix implemented and covered:
	- `apps/web/lib/format.ts` invalid-date fallback behavior
- [ ] Playwright E2E suites for critical journeys
- [ ] Accessibility scanner checks for critical flows

### Validation Checklist

- [x] Test suite passes for `apps/web`.
- [x] Typecheck passes for `apps/web`.
- [x] Build passes for `apps/web`.
- [ ] No high-severity accessibility findings in critical flows.

### Evidence

- Test (run 1): `pnpm --filter @smart-bursary/web run test` passed (13/13).
- Test (run 2): `pnpm --filter @smart-bursary/web run test` passed (13/13).
- Typecheck: `pnpm --filter @smart-bursary/web run typecheck` passed.
- Build: `pnpm --filter @smart-bursary/web run build` passed.

### Blockers and Gaps

- Playwright E2E coverage for student submit, ward review, county allocation, and reporting exports is pending.
- Accessibility scanner baseline for critical flows is pending.

### Completion Gate

- [ ] All deliverables done.
- [ ] All validation checks done.
- [ ] No unresolved blocker.
- [ ] Phase status set to Completed.

---

## W0 - Foundation and Auth Surface

Status: Completed
Owner: GitHub Copilot
Scope Window: 2026-04-16

### In Scope

- Web foundation setup (TypeScript, Next.js config, Tailwind config, PostCSS).
- Global design tokens and baseline styling per UI/UX system design.
- Root app shell and global route handling (`/`, `not-found`, `error`).
- Core UI primitives used by auth pages (`button`, `input`, `card`, `badge`, `spinner`).
- Auth surface pages (`/login`, `/register`, `/verify-email`, `/verify-phone`, `/forgot-password`, `/reset-password`).
- Compile-safe placeholders for all remaining route files so build can pass while future phases stay isolated.

### Out of Scope

- Student business pages and data wiring.
- Application wizard functionality.
- Admin dashboards and review workflows.
- API integration beyond foundational helpers.

### Deliverables

- [x] `apps/web/tsconfig.json` implemented.
- [x] `apps/web/next.config.ts` implemented.
- [x] `apps/web/postcss.config.js` created.
- [x] `apps/web/tailwind.config.ts` implemented from design tokens.
- [x] `apps/web/styles/globals.css` implemented with tokenized foundation.
- [x] Root app files implemented (`layout.tsx`, `page.tsx`, `error.tsx`, `not-found.tsx`, `next-env.d.ts`).
- [x] Auth route layout and six auth pages implemented.
- [x] Core utility/auth starter files implemented (`lib/*`, `store/auth-store.ts`, `hooks/use-auth.ts`).
- [x] Remaining app routes made compile-safe with placeholders.

### Validation Checklist

- [x] Typecheck passes for `apps/web`.
- [x] Build passes for `apps/web`.
- [x] App Router route compilation passes for all scaffolded routes.

### Evidence

- Typecheck: `pnpm --filter @smart-bursary/web run typecheck` passed.
- Build: `pnpm run build` in `apps/web` passed with successful route generation.
- Notes: `typedRoutes` warning was resolved by moving config from `experimental.typedRoutes` to top-level `typedRoutes`.

### Blockers and Gaps

- None.

### Completion Gate

- [x] All deliverables done.
- [x] All validation checks done.
- [x] No unresolved blocker.
- [x] Phase status set to Completed.

---

## W2 - Application Wizard (Sections A-F)

Status: Completed
Owner: GitHub Copilot
Scope Window: 2026-04-16

### In Scope

- End-to-end activation of the student application wizard routes for Sections A-F.
- Wizard state persistence and auto-save wiring for each section.
- Section gating and sequential navigation from A to F.
- W1-to-W2 continuation actions for draft applications.
- Student desktop sidebar UX update to span full viewport height under sticky header.

### Out of Scope

- Final preview/submission business logic beyond handoff to existing preview route.
- Backend/API persistence integration for wizard payloads.
- Ward/county/admin workflow updates.

### Deliverables

- [x] Wizard route shell implemented:
	- `apps/web/app/(student)/apply/[programId]/layout.tsx`
	- `apps/web/app/(student)/apply/[programId]/page.tsx`
- [x] Functional wizard section pages implemented:
	- `apps/web/app/(student)/apply/[programId]/section-a/page.tsx`
	- `apps/web/app/(student)/apply/[programId]/section-b/page.tsx`
	- `apps/web/app/(student)/apply/[programId]/section-c/page.tsx`
	- `apps/web/app/(student)/apply/[programId]/section-d/page.tsx`
	- `apps/web/app/(student)/apply/[programId]/section-e/page.tsx`
	- `apps/web/app/(student)/apply/[programId]/section-f/page.tsx`
- [x] Wizard data infra wired and stabilized:
	- `apps/web/store/application-wizard-store.ts`
	- `apps/web/hooks/use-auto-save.ts`
	- `apps/web/lib/wizard.ts`
- [x] W1 draft continuation connected to W2:
	- `apps/web/components/application/application-card.tsx`
	- `apps/web/app/(student)/applications/[id]/page.tsx`
- [x] Desktop sidebar viewport span behavior implemented:
	- `apps/web/components/layout/student-sidebar.tsx`

### Validation Checklist

- [x] Typecheck passes for `apps/web`.
- [x] Build passes for `apps/web`.
- [x] No VS Code Problems for `apps/web` after W2 changes.
- [x] Wizard runtime loop issue resolved (unstable Zustand selector removed in wizard layout).

### Evidence

- Typecheck: `pnpm --filter @smart-bursary/web run typecheck` passed.
- Build: `pnpm --filter @smart-bursary/web run build` passed and generated all wizard routes.
- Diagnostics: `get_errors` reported no errors for `apps/web`.

### Blockers and Gaps

- None.

### Completion Gate

- [x] All deliverables done.
- [x] All validation checks done.
- [x] No unresolved blocker.
- [x] Phase status set to Completed.

---

## W3 - Student Preview and Submission UX

Status: Completed
Owner: GitHub Copilot
Scope Window: 2026-04-16

### In Scope

- Step 7 preview experience for student applications with declaration-gated submission.
- Submission handoff UX from preview to applications detail view.
- Local submission state overlay so dashboard/list/detail reflect newly submitted drafts.
- Printable/downloadable application output via student and API PDF route handlers.
- Status communication enhancements in application detail (timeline and action prompts).

### Out of Scope

- Backend persistence and workflow API integration for final submission writes.
- Ward/county/admin workflow implementation.
- Reporting and analytics screens.

### Deliverables

- [x] Step 7 preview route implemented and connected:
	- `apps/web/app/(student)/apply/[programId]/preview/page.tsx`
- [x] Local submission state store created and wired:
	- `apps/web/store/student-application-store.ts`
	- `apps/web/hooks/use-application.ts`
- [x] Student dashboard and applications views updated to consume merged submission state:
	- `apps/web/app/(student)/dashboard/page.tsx`
	- `apps/web/app/(student)/applications/page.tsx`
	- `apps/web/app/(student)/applications/[id]/page.tsx`
- [x] Printable preview template utility implemented:
	- `apps/web/lib/application-preview.ts`
- [x] PDF route handlers implemented (placeholder 501 removed):
	- `apps/web/app/(student)/applications/[id]/pdf/route.ts`
	- `apps/web/app/api/applications/[id]/pdf/route.ts`
- [x] Application card/detail download actions connected to functional PDF route:
	- `apps/web/components/application/application-card.tsx`
	- `apps/web/app/(student)/applications/[id]/page.tsx`
- [x] Phase 2B PDF fidelity completed with true PDF generation:
	- `apps/web/lib/application-pdf.tsx`
	- `apps/web/lib/application-pdf-data.ts`
	- `apps/web/app/api/applications/preview/pdf/route.ts`
	- `apps/web/app/(student)/apply/[programId]/preview/page.tsx`
	- Updated `/applications/[id]/pdf` and `/api/applications/[id]/pdf` routes to return `application/pdf` bytes.

### Validation Checklist

- [x] Typecheck passes for `apps/web`.
- [x] Build passes for `apps/web`.
- [x] Dynamic route type validation passes for both PDF endpoints.

### Evidence

- Typecheck: `pnpm --filter @smart-bursary/web run typecheck` passed.
- Build: `pnpm --filter @smart-bursary/web run build` passed and generated both `/applications/[id]/pdf` and `/api/applications/[id]/pdf` routes.
- Phase 2B validation rerun: `pnpm --filter @smart-bursary/web run test`, `pnpm --filter @smart-bursary/web run typecheck`, and `pnpm --filter @smart-bursary/web run build` all passed after true-PDF route conversion and preview download wiring.

### Blockers and Gaps

- None.

### Completion Gate

- [x] All deliverables done.
- [x] All validation checks done.
- [x] No unresolved blocker.
- [x] Phase status set to Completed.

---

## W4 - Ward and County Admin Portals

Status: Completed
Owner: GitHub Copilot
Scope Window: 2026-04-17

### In Scope

- Admin shell for ward and county spaces (header, sidebar, county branding inheritance).
- Ward portal workflow screens: dashboard, applications queue, application detail, documents view, and AI score view.
- County finance workflow screens: dashboard, county review queue, final review detail, disbursement queue, and batch export preview.
- Reusable admin workflow components for AI score visualization, document review list, budget utilization, and review decision capture.

### Out of Scope

- Reporting screens (`/ward/reports`, `/county/reports`, `/county/reports/ocob`) reserved for W5.
- Operations portal screens (`/tenants`, `/health`) reserved for W5.
- Backend-persistent review/disbursement writes (this phase remains frontend workflow implementation).

### Deliverables

- [x] Admin layout shell implemented:
	- `apps/web/app/(admin)/layout.tsx`
	- `apps/web/components/layout/admin-header.tsx`
	- `apps/web/components/layout/admin-sidebar.tsx`
- [x] Admin workflow data and navigation layer implemented:
	- `apps/web/lib/admin-data.ts`
	- `apps/web/lib/admin-navigation.ts`
- [x] Reusable W4 application workflow components implemented:
	- `apps/web/components/application/ai-score-card.tsx`
	- `apps/web/components/application/document-viewer.tsx`
	- `apps/web/components/application/budget-bar.tsx`
	- `apps/web/components/application/review-panel.tsx`
- [x] Ward portal W4 routes implemented:
	- `apps/web/app/(admin)/ward/dashboard/page.tsx`
	- `apps/web/app/(admin)/ward/applications/page.tsx`
	- `apps/web/app/(admin)/ward/applications/[id]/page.tsx`
	- `apps/web/app/(admin)/ward/applications/[id]/documents/page.tsx`
	- `apps/web/app/(admin)/ward/applications/[id]/score/page.tsx`
- [x] County finance portal W4 routes implemented:
	- `apps/web/app/(admin)/county/dashboard/page.tsx`
	- `apps/web/app/(admin)/county/review/page.tsx`
	- `apps/web/app/(admin)/county/review/[id]/page.tsx`
	- `apps/web/app/(admin)/county/disbursements/page.tsx`
	- `apps/web/app/(admin)/county/disbursements/batch/page.tsx`

### Validation Checklist

- [x] Typecheck passes for `apps/web`.
- [x] Build passes for `apps/web`.
- [x] W4 route compilation confirmed for ward and county workflow paths.

### Evidence

- Typecheck: `pnpm --filter @smart-bursary/web run typecheck` passed.
- Build: `pnpm --filter @smart-bursary/web run build` passed and generated W4 routes (`/ward/*`, `/county/*`).

### Blockers and Gaps

- None.

### Completion Gate

- [x] All deliverables done.
- [x] All validation checks done.
- [x] No unresolved blocker.
- [x] Phase status set to Completed.

---

## W5 - Reporting and Operational Screens

Status: Completed
Owner: GitHub Copilot
Scope Window: 2026-04-17

### In Scope

- Reporting surfaces for ward and county teams (`/ward/reports`, `/county/reports`, `/county/reports/ocob`).
- Operational console shell and routes for tenant oversight and platform health (`/tenants`, `/tenants/[slug]`, `/health`).
- Frontend-only export and preview actions for report outputs.
- Completion of document interaction actions (View and Download) in admin review flows.

### Out of Scope

- Backend persistence and workflow APIs for report generation or operator actions.
- Binary file streaming for uploaded source documents.
- Frontend automated test hardening (reserved for W6).

### Deliverables

- [x] Reporting data and export utility layer implemented:
	- `apps/web/lib/reporting-data.ts`
	- `apps/web/lib/client-download.ts`
- [x] Ward and county reporting routes implemented:
	- `apps/web/app/(admin)/ward/reports/page.tsx`
	- `apps/web/app/(admin)/county/reports/page.tsx`
	- `apps/web/app/(admin)/county/reports/ocob/page.tsx`
- [x] Operations data and route stack implemented:
	- `apps/web/lib/ops-data.ts`
	- `apps/web/app/(ops)/layout.tsx`
	- `apps/web/app/(ops)/tenants/page.tsx`
	- `apps/web/app/(ops)/tenants/[slug]/page.tsx`
	- `apps/web/app/(ops)/health/page.tsx`
- [x] Admin document interaction actions implemented:
	- `apps/web/components/application/document-viewer.tsx` (View and Download actions now functional)

### Validation Checklist

- [x] Typecheck passes for `apps/web`.
- [x] Build passes for `apps/web`.
- [x] W5 route compilation confirmed for reporting and operations paths.

### Evidence

- Typecheck: `pnpm --filter @smart-bursary/web run typecheck` passed.
- Build: `pnpm --filter @smart-bursary/web run build` passed and generated W5 routes (`/ward/reports`, `/county/reports`, `/county/reports/ocob`, `/tenants`, `/tenants/[slug]`, `/health`).

### Blockers and Gaps

- None.

### Completion Gate

- [x] All deliverables done.
- [x] All validation checks done.
- [x] No unresolved blocker.
- [x] Phase status set to Completed.

---

## W1 - Student Portal Core Slice

Status: Completed
Owner: GitHub Copilot
Scope Window: 2026-04-16

### In Scope

- Student layout shell implementation (header, mobile bottom navigation, county branding provider).
- Student dashboard, programs, applications, and profile pages implementation.
- Dynamic student detail pages for program and application records.
- Shared student-facing components for cards, status badges, timeline, and empty states.
- Student data and formatting utility scaffolding for API-ready presentation.

### Out of Scope

- Multi-step application wizard implementation (`/apply/*` routes).
- Student PDF generation flow internals beyond existing route placeholders.
- Ward/county/admin business screens.

### Deliverables

- [x] Student layout components implemented:
	- `apps/web/components/layout/county-branding-provider.tsx`
	- `apps/web/components/layout/student-header.tsx`
	- `apps/web/components/layout/student-bottom-nav.tsx`
- [x] Student shared/application components implemented:
	- `apps/web/components/shared/county-logo.tsx`
	- `apps/web/components/shared/stats-card.tsx`
	- `apps/web/components/shared/empty-state.tsx`
	- `apps/web/components/application/status-badge.tsx`
	- `apps/web/components/application/application-card.tsx`
	- `apps/web/components/application/timeline.tsx`
- [x] Student hooks/stores/data utilities implemented:
	- `apps/web/store/county-store.ts`
	- `apps/web/hooks/use-county.ts`
	- `apps/web/hooks/use-application.ts`
	- `apps/web/lib/format.ts`
	- `apps/web/lib/student-data.ts`
- [x] Student routes replaced with functional W1 views:
	- `apps/web/app/(student)/layout.tsx`
	- `apps/web/app/(student)/dashboard/page.tsx`
	- `apps/web/app/(student)/programs/page.tsx`
	- `apps/web/app/(student)/programs/[id]/page.tsx`
	- `apps/web/app/(student)/applications/page.tsx`
	- `apps/web/app/(student)/applications/[id]/page.tsx`
	- `apps/web/app/(student)/profile/page.tsx`
	- `apps/web/app/(student)/profile/personal/page.tsx`
	- `apps/web/app/(student)/profile/academic/page.tsx`
	- `apps/web/app/(student)/profile/family/page.tsx`

### Validation Checklist

- [x] Typecheck passes for `apps/web`.
- [x] Build passes for `apps/web`.
- [x] No VS Code Problems for `apps/web` after W1 changes.

### Evidence

- Typecheck: `pnpm --filter @smart-bursary/web run typecheck` passed.
- Build: `pnpm --filter @smart-bursary/web run build` passed and generated all app routes.
- Problems panel parity: no errors reported for `apps/web` via diagnostics check.

### Blockers and Gaps

- None.

### Completion Gate

- [x] All deliverables done.
- [x] All validation checks done.
- [x] No unresolved blocker.
- [x] Phase status set to Completed.
