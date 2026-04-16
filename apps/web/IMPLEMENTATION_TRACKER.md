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
| W2 | Application Wizard (Sections A-F) | Not Started | TBD | - | - |
| W3 | Student Preview and Submission UX | Not Started | TBD | - | - |
| W4 | Ward and County Admin Portals | Not Started | TBD | - | - |
| W5 | Reporting and Operational Screens | Not Started | TBD | - | - |
| W6 | Frontend Testing and Hardening | Not Started | TBD | - | - |

---

## Active Phase Rule

Only one phase may be marked In Progress at any time.

Current active phase: None (W1 completed)

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
