# KauntyBursary PRD Traceability Matrix

Status: Drafted (Phase 0 deliverable)
Last Updated: 2026-04-17
Source of Truth: Docs/01-PRD.md
Related Plan: Docs/08-IMPLEMENTATION-PLAN.md

## Classification Legend

- Implemented: Requirement behavior exists end-to-end with code evidence.
- Partial: Some behavior exists, but acceptance criteria are not fully met.
- Missing: No meaningful implementation found in current codebase.
- Deferred: Explicitly postponed to a future phase.

## Summary Snapshot

- Total functional requirements tracked: 42
- Implemented: 6
- Partial: 26
- Missing: 10
- Deferred: 0

## Requirement Matrix

| ID | PRD Requirement (Short) | Status | Evidence (Current) | Gap Notes | Target Phase | Owner |
|---|---|---|---|---|---|---|
| TM-01 | Multi-tenant county isolation | Partial | apps/api/common/decorators/county.decorator.ts, apps/api/modules/application/application.service.ts, apps/api/prisma/schema.prisma | County-scoped querying exists; DB-level RLS policy artifacts not found in migrations | Phase 7 | BE |
| TM-02 | Configurable county brand profile | Partial | apps/web/components/layout/county-branding-provider.tsx, apps/web/hooks/use-county.ts | Brand surface exists, but admin settings/API for full tenant branding management are incomplete | Phase 4 | BE+FE |
| TM-03 | Platform operator county provisioning | Missing | apps/api/modules/tenant/provisioning.service.ts (empty), apps/api/modules/tenant/tenant.controller.ts (empty) | No provisioning API/workflow implemented | Phase 4A (new) | BE |
| TM-04 | Plan-tier feature gating | Missing | apps/api/modules/tenant/tenant.service.ts (empty), apps/api/modules/tenant/tenant.controller.ts (empty) | No enforced plan-tier feature flags found | Phase 4A (new) | BE |
| AU-01 | Email/password registration + email verification enforcement | Partial | apps/api/modules/auth/auth.controller.ts, apps/api/modules/auth/auth.service.ts | Email verification endpoint exists, but submission gating on verified status is not enforced in application flow | Phase 2A (new) | BE |
| AU-02 | Phone OTP verification required before first submission | Partial | apps/api/modules/auth/auth.controller.ts, apps/api/modules/auth/auth.service.ts | OTP issuance/verification exists, but first-submission enforcement is not present in application flow | Phase 2A (new) | BE |
| AU-03 | JWT access + refresh token model | Implemented | apps/api/modules/auth/auth.controller.ts, apps/api/modules/auth/auth-token.service.ts, apps/api/modules/auth/auth-session.service.ts | Validate expiry and rotation behavior under hardening suite | Phase 7 validation | BE |
| AU-04 | RBAC roles enforced | Partial | apps/api/common/guards/roles.guard.ts, apps/api/modules/review/review.controller.ts, apps/api/modules/disbursement/disbursement.controller.ts | Role decorators/guard exist, but full endpoint matrix validation is not complete | Phase 7 | BE |
| AU-05 | Ward admin scope restriction | Partial | apps/api/modules/review/ward-review.service.ts, apps/api/modules/ai/ai.controller.ts | Service-layer ward checks exist; full RLS-backed guarantee and broad integration tests missing | Phase 7 | BE |
| SP-01 | Multi-step profile completion before submit | Missing | apps/api/modules/profile/profile.controller.ts (empty), apps/api/modules/profile/profile.service.ts (empty) | No profile API/completeness enforcement in backend submit path | Phase 2A (new) | BE |
| SP-02 | Capture official form fields A-G | Partial | apps/web/app/(student)/apply/[programId]/section-a/page.tsx, apps/web/app/(student)/apply/[programId]/section-f/page.tsx, apps/api/modules/application/application.service.ts | Wizard exists, but formal field mapping/validation parity to gazetted schema is incomplete | Phase 2A (new) | BE+FE |
| SP-03 | National ID unique per county | Missing | apps/api/prisma/schema.prisma (StudentProfile nationalId has no county composite uniqueness) | Required DB uniqueness constraint not present | Phase 2A (new) | BE |
| SP-04 | Family/financial/HELB/prior-bursary captured and surfaced | Partial | apps/api/prisma/schema.prisma (family/financial models), apps/api/modules/ai/ai-score.service.ts | Data model exists, but profile APIs/surface paths are incomplete | Phase 2A (new) | BE+FE |
| BP-01 | County program creation and management | Implemented | apps/api/modules/program/program.controller.ts, apps/api/modules/program/program-lifecycle.service.ts, apps/api/modules/program/dto/create-program.dto.ts, apps/api/modules/program/dto/update-program.dto.ts, apps/api/test/integration/program-lifecycle.e2e-spec.ts | Lifecycle endpoints implemented and validated with passing integration tests (8/8) | Phase 1 | BE |
| BP-02 | Eligibility-based program visibility | Missing | apps/api/modules/program/eligibility.service.ts (empty), apps/api/modules/program/program.service.ts | No profile-driven eligibility engine or ineligibility reason response | Phase 2 | BE |
| BP-03 | Reject late submissions after closes_at | Partial | apps/api/modules/application/application.service.ts | Close-window check exists, but semantics/contract mismatch (error class/status details vs spec) | Phase 2 | BE |
| BP-04 | Budget ceiling via advisory lock | Implemented | apps/api/modules/review/county-review.service.ts | Advisory lock and ceiling guard exist; needs stress validation in hardening | Phase 7 validation | BE |
| AF-01 | Multi-step wizard A-F aligned with official form | Partial | apps/web/app/(student)/apply/[programId]/section-a/page.tsx through section-f/page.tsx | Wizard exists; strict legal-form parity validation still pending | Phase 2A (new) | FE |
| AF-02 | Final pre-submit PDF preview with official layout | Partial | apps/web/app/(student)/apply/[programId]/preview/page.tsx, apps/web/lib/application-preview.ts | Preview rendered, but true PDF fidelity and visual-diff acceptance are not yet enforced | Phase 2B (new) | FE |
| AF-03 | Download filled PDF before/after submission | Partial | apps/web/app/(student)/apply/[programId]/preview/page.tsx, apps/web/app/(student)/applications/[id]/pdf/route.ts | Download path currently HTML-based output, not finalized county-branded PDF artifact | Phase 2B (new) | FE+BE |
| AF-04 | Document uploads with validation, virus scan, S3 storage | Partial | apps/api/modules/document/document.controller.ts, apps/api/modules/document/document.service.ts, apps/api/queue/queue.service.ts | Upload/scan queue exists; storage is local file path, not S3-backed production flow | Phase 2B (new) | BE |
| AF-05 | Duplicate applications rejected with conflict | Partial | apps/api/prisma/schema.prisma (applicantId/programId unique), apps/api/modules/application/application.service.ts | Duplicate attempts return existing record rather than explicit conflict response | Phase 2 | BE |
| AF-06 | County form customization settings | Missing | apps/web/app/(admin)/settings/branding/page.tsx (placeholder), apps/web/app/(admin)/settings/page.tsx (placeholder) | Settings UI and backend form customization controls missing | Phase 4 | BE+FE |
| AI-01 | Auto-enqueue AI scoring on submit | Missing | apps/api/modules/application/application.service.ts, apps/api/queue/queue.module.ts | Submit flow does not enqueue AI scoring job | Phase 2C (new) | BE |
| AI-02 | AI scoring dimensions and 0-100 breakdown | Partial | apps/api/modules/internal/internal.controller.ts, apps/api/modules/internal/dto/ingest-ai-score.dto.ts, apps/ai-scoring/* | Ingestion contract exists; end-to-end triggered scoring pipeline from submit is incomplete | Phase 2C (new) | BE+AI |
| AI-03 | Score card visible only to ward/finance/county roles | Implemented | apps/api/modules/ai/ai.controller.ts | Role scope appears correct; validate with security regression tests | Phase 7 validation | BE |
| AI-04 | Anomaly flags surfaced | Partial | apps/api/modules/internal/dto/ingest-ai-score.dto.ts, apps/web/components/application/ai-score-card.tsx | Data structures and UI exist; systematic anomaly generation flow is incomplete | Phase 2C (new) | BE+FE |
| AI-05 | County-configurable scoring weights | Partial | apps/api/modules/ai/ai.controller.ts, apps/api/modules/ai/scoring-weights.service.ts, apps/web/app/(admin)/settings/ai-scoring/page.tsx (placeholder) | Backend endpoint exists; county admin settings UI remains placeholder | Phase 4 | BE+FE |
| AI-06 | AI never auto-approves/rejects | Partial | apps/api/modules/internal/internal.controller.ts, apps/api/modules/review/review.controller.ts | Separation exists, but explicit safeguards and regression tests should be hardened | Phase 7 | BE |
| RW-01 | Workflow statuses with timeline audit | Partial | apps/api/modules/application/application.service.ts, apps/api/modules/review/ward-review.service.ts, apps/api/modules/review/county-review.service.ts | Core transitions/timeline exist; full state-machine and audit invariants need coverage | Phase 7 | BE |
| RW-02 | Ward recommend/return/reject actions | Implemented | apps/api/modules/review/review.controller.ts, apps/api/modules/review/ward-review.service.ts | Validate edge constraints and notification hooks under hardening suite | Phase 7 validation | BE |
| RW-03 | County final allocation at COUNTY_REVIEW | Implemented | apps/api/modules/review/review.controller.ts, apps/api/modules/review/county-review.service.ts | Validate concurrency and race conditions under load tests | Phase 7 validation | BE |
| RW-04 | SMS on every status change | Missing | apps/api/modules/notification/notification.module.ts (empty), apps/api/modules/notification/sms.service.ts (empty) | Notification module exists as empty scaffolding; no dispatch integration found | Phase 2D (new) | BE |
| RW-05 | Review notes in audit trail | Partial | apps/api/modules/review/ward-review.service.ts, apps/api/modules/review/county-review.service.ts | Notes are saved in review/timeline metadata; complete timeline query surfaces need confirmation | Phase 7 | BE |
| DB-01 | Trigger M-Pesa B2C disbursement | Partial | apps/api/modules/disbursement/disbursement.controller.ts, apps/api/modules/disbursement/disbursement.service.ts, apps/api/modules/disbursement/mpesa.service.ts | Records are created; external M-Pesa execution orchestration is not wired end-to-end | Phase 5A (new) | BE |
| DB-02 | EFT RTGS batch export | Partial | apps/api/modules/disbursement/eft-export.service.ts | RTGS CSV generator exists; finance-facing endpoint/workflow is incomplete | Phase 5A (new) | BE |
| DB-03 | Disbursement receipt PDF | Partial | apps/api/modules/disbursement/receipt.service.ts | Receipt buffer is text; no PDF generation endpoint for student download | Phase 5A (new) | BE+FE |
| DB-04 | Failed disbursement retries (max 3) + alerting | Missing | apps/api/modules/disbursement/disbursement.service.ts | No retry policy/attempt counter/alert flow found | Phase 5A (new) | BE |
| RP-01 | Real-time dashboard for county finance/admin | Partial | apps/api/modules/reporting/reporting.controller.ts, apps/api/modules/reporting/reporting.service.ts, apps/web/app/(admin)/county/dashboard/page.tsx | Dashboard endpoints/UI exist; near-real-time refresh SLA enforcement remains pending | Phase 5 | BE+FE |
| RP-02 | OCOB-ready Excel and PDF reports | Partial | apps/web/app/(admin)/county/reports/ocob/page.tsx, apps/web/lib/reporting-data.ts, apps/api/modules/reporting/reporting.controller.ts | OCOB screens/exports exist, but formal compliance validation against OCOB template is pending | Phase 5 | BE+FE |
| RP-03 | Ward-level Excel/PDF export with AI + recommendation + reviewer | Partial | apps/web/app/(admin)/ward/reports/page.tsx, apps/api/modules/reporting/reporting.service.ts | Export UI exists; required reviewer-level data completeness is not fully enforced | Phase 5 | BE+FE |
| RP-04 | Historical trend analysis filters | Missing | apps/api/modules/reporting/reporting.service.ts, apps/web/app/(admin)/county/reports/page.tsx | No time-series trend endpoint/filter set for year/program/ward/education-level found | Phase 5 | BE+FE |

## Tracker Correction Notes (Phase 0 Deliverable)

1. Corrected stale backend active-phase line:
- Updated apps/api/IMPLEMENTATION_TRACKER.md from "Current active phase: None (P4 completed)" to "Current active phase: None (P6 completed)".

2. Plan alignment note:
- Matrix surfaced additional missing slices not explicitly represented in Docs/08-IMPLEMENTATION-PLAN.md:
  - Phase 2A/2B/2C/2D style profile, form-fidelity, AI trigger, and notification completion slices.
  - Phase 4A tenant provisioning and plan-tier gating.
  - Phase 5A disbursement completion slice.
- These should be added as plan addendum before Phase 1 execution begins.

## Suggested Execution Order Update

To keep dependency order coherent:

1. Phase 0 (complete): Traceability + tracker correction
2. Phase 1: Programs lifecycle API
3. Phase 2: Eligibility engine
4. Phase 2A: Profile APIs and completion gating
5. Phase 2B: PDF/document production fidelity (S3 + true PDF)
6. Phase 2C: AI trigger and scoring pipeline completion
7. Phase 2D: Notification/SMS integration on status transitions
8. Phase 3: County program UI
9. Phase 4: Settings UI completion (branding/users/wards/AI weights)
10. Phase 4A: Tenant provisioning and plan-tier feature gates
11. Phase 5: Reporting completion and trend analytics
12. Phase 5A: Disbursement execution/retry/receipt completion
13. Phase 6: Frontend hardening
14. Phase 7: Backend hardening and release readiness
