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
| W1 | Student Portal Core Slice | Not Started | TBD | - | - |
| W2 | Application Wizard (Sections A-F) | Not Started | TBD | - | - |
| W3 | Student Preview and Submission UX | Not Started | TBD | - | - |
| W4 | Ward and County Admin Portals | Not Started | TBD | - | - |
| W5 | Reporting and Operational Screens | Not Started | TBD | - | - |
| W6 | Frontend Testing and Hardening | Not Started | TBD | - | - |

---

## Active Phase Rule

Only one phase may be marked In Progress at any time.

Current active phase: None (W0 completed)

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
