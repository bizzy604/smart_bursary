# KauntyBursary PRD Traceability Matrix

Status: Maintained (Phase 0 deliverable)
Last Updated: 2026-04-17
Source of Truth: Docs/01-PRD.md
Related Plan: Docs/08-IMPLEMENTATION-PLAN.md
Detailed Remaining Queue: Docs/10-FUNCTIONAL-CLOSURE-BACKLOG.md

## Classification Legend

- Implemented: Requirement behavior exists end-to-end with code evidence.
- Partial: Some behavior exists, but acceptance criteria are not fully met.
- Missing: No meaningful implementation found in current codebase.
- Deferred: Explicitly postponed to a future phase.

## Summary Snapshot

- Total functional requirements tracked: 42
- Implemented: 22
- Partial: 14
- Missing: 6
- Deferred: 0

## Requirement Matrix

| ID | PRD Requirement (Short) | Status | Evidence (Current) | Gap Notes | Target Phase | Owner |
|---|---|---|---|---|---|---|
| TM-01 | Multi-tenant county isolation | Partial | apps/api/common/decorators/county.decorator.ts, apps/api/modules/application/application.service.ts, apps/api/prisma/schema.prisma | County-scoped querying exists; DB-level RLS policy artifacts not found in migrations | Phase 7 | BE |
| TM-02 | Configurable county brand profile | Partial | apps/web/components/layout/county-branding-provider.tsx, apps/web/hooks/use-county.ts | Brand surface exists, but admin settings/API for full tenant branding management are incomplete | Phase 4 | BE+FE |
| TM-03 | Platform operator county provisioning | Missing | apps/api/modules/tenant/provisioning.service.ts (empty), apps/api/modules/tenant/tenant.controller.ts (empty) | No provisioning API/workflow implemented | Phase 4A (new) | BE |
| TM-04 | Plan-tier feature gating | Missing | apps/api/modules/tenant/tenant.service.ts (empty), apps/api/modules/tenant/tenant.controller.ts (empty) | No enforced plan-tier feature flags found | Phase 4A (new) | BE |
| AU-01 | Email/password registration + email verification enforcement | Implemented | apps/api/modules/auth/auth.controller.ts, apps/api/modules/application/application-submission.service.ts, apps/api/modules/profile/profile-completion.service.ts, apps/api/test/integration/profile-gating.e2e-spec.ts | Submission now returns semantic `PROFILE_INCOMPLETE` until email verification is complete | Phase 2A (new) | BE |
| AU-02 | Phone OTP verification required before first submission | Implemented | apps/api/modules/auth/auth.controller.ts, apps/api/modules/application/application-submission.service.ts, apps/api/modules/profile/profile-completion.service.ts, apps/api/test/integration/profile-gating.e2e-spec.ts | Submission now returns semantic `PROFILE_INCOMPLETE` until phone OTP verification is complete | Phase 2A (new) | BE |
| AU-03 | JWT access + refresh token model | Implemented | apps/api/modules/auth/auth.controller.ts, apps/api/modules/auth/auth-token.service.ts, apps/api/modules/auth/auth-session.service.ts | Validate expiry and rotation behavior under hardening suite | Phase 7 validation | BE |
| AU-04 | RBAC roles enforced | Partial | apps/api/common/guards/roles.guard.ts, apps/api/modules/review/review.controller.ts, apps/api/modules/disbursement/disbursement.controller.ts | Role decorators/guard exist, but full endpoint matrix validation is not complete | Phase 7 | BE |
| AU-05 | Ward admin scope restriction | Partial | apps/api/modules/review/ward-review.service.ts, apps/api/modules/ai/ai.controller.ts | Service-layer ward checks exist; full RLS-backed guarantee and broad integration tests missing | Phase 7 | BE |
| SP-01 | Multi-step profile completion before submit | Implemented | apps/api/modules/profile/profile.controller.ts, apps/api/modules/profile/profile.service.ts, apps/api/modules/profile/profile-completion.service.ts, apps/api/modules/application/application-submission.service.ts, apps/api/test/integration/profile-gating.e2e-spec.ts | Personal, academic, and family profile sections are enforced prior to submission | Phase 2A (new) | BE |
| SP-02 | Capture official form fields A-G | Implemented | apps/web/app/(student)/apply/[programId]/section-b/page.tsx, apps/web/app/(student)/apply/[programId]/section-c/page.tsx, apps/api/modules/application/section.service.ts, apps/api/modules/application/dto/section-a.dto.ts through section-f.dto.ts, apps/api/test/integration/student-application-fidelity.e2e-spec.ts | Wizard payload mapping and section-by-section API contract validation are enforced and validated. | B-01 | BE+FE |
| SP-03 | National ID unique per county | Implemented | apps/api/prisma/schema.prisma, apps/api/prisma/migrations/20260417113000_phase2a_profile_national_id_unique/migration.sql | County-scoped composite uniqueness enforced at DB and Prisma model levels | Phase 2A (new) | BE |
| SP-04 | Family/financial/HELB/prior-bursary captured and surfaced | Implemented | apps/web/app/(student)/apply/[programId]/section-b/page.tsx, apps/web/app/(student)/apply/[programId]/section-c/page.tsx, apps/web/app/(student)/apply/[programId]/section-e/page.tsx, apps/api/modules/application/dto/section-b.dto.ts, apps/api/modules/application/dto/section-c.dto.ts, apps/api/modules/application/dto/section-d.dto.ts, apps/api/modules/application/dto/section-e.dto.ts, apps/api/test/integration/student-application-fidelity.e2e-spec.ts | Family status, guardian income context, sibling burden, HELB status, prior bursary disclosure, and disability disclosures are persisted and surfaced through section payloads. | B-01 | BE+FE |
| BP-01 | County program creation and management | Implemented | apps/api/modules/program/program.controller.ts, apps/api/modules/program/program-lifecycle.service.ts, apps/api/modules/program/dto/create-program.dto.ts, apps/api/modules/program/dto/update-program.dto.ts, apps/api/test/integration/program-lifecycle.e2e-spec.ts | Lifecycle endpoints implemented and validated with passing integration tests (8/8) | Phase 1 | BE |
| BP-02 | Eligibility-based program visibility | Implemented | apps/api/modules/program/eligibility.service.ts, apps/api/modules/program/program.service.ts, apps/api/modules/program/program.controller.ts, apps/api/test/integration/program-eligibility.e2e-spec.ts | Student discovery now computes eligibility and exposes ineligibility reason fields with integration validation | Phase 2 | BE |
| BP-03 | Reject late submissions after closes_at | Implemented | apps/api/modules/application/application-submission.service.ts, apps/api/common/filters/global-exception.filter.ts, apps/api/test/integration/program-eligibility.e2e-spec.ts | Submission path now returns semantic `PROGRAM_CLOSED` validation error when closes_at has elapsed | Phase 2 | BE |
| BP-04 | Budget ceiling via advisory lock | Implemented | apps/api/modules/review/county-review.service.ts | Advisory lock and ceiling guard exist; needs stress validation in hardening | Phase 7 validation | BE |
| AF-01 | Multi-step wizard A-F aligned with official form | Implemented | apps/web/app/(student)/apply/[programId]/section-a/page.tsx through section-f/page.tsx, apps/web/store/application-wizard-store.ts, apps/web/store/application-wizard-store.test.ts, apps/api/modules/application/section.service.ts | Wizard captures the official section payload shape and backend validates each section contract before persistence. | B-01 | FE |
| AF-02 | Final pre-submit PDF preview with official layout | Implemented | apps/web/app/(student)/apply/[programId]/preview/page.tsx, apps/web/lib/application-pdf.tsx, apps/web/lib/application-pdf-client.ts, apps/web/app/api/applications/preview/pdf/route.ts | Preview now renders server-generated PDF bytes from captured wizard sections | Phase 2B (new) | FE |
| AF-03 | Download filled PDF before/after submission | Implemented | apps/web/components/application/application-pdf-button.tsx, apps/web/store/student-application-store.ts, apps/web/app/(student)/applications/[id]/page.tsx, apps/web/components/application/application-card.tsx | Download actions now reuse captured submission snapshots or hydrated wizard sections to generate the PDF | Phase 2B (new) | FE+BE |
| AF-04 | Document uploads with validation, virus scan, S3 storage | Implemented | apps/api/modules/document/s3.service.ts, apps/api/modules/document/document.service.ts, apps/api/test/integration/document.e2e-spec.ts, apps/api/test/integration/document-scan-auth.e2e-spec.ts | S3-backed upload, signed download URLs, and async scan flow are covered by integration tests | Phase 2B (new) | BE |
| AF-05 | Duplicate applications rejected with conflict | Implemented | apps/api/prisma/schema.prisma, apps/api/modules/application/application-submission.service.ts, apps/api/common/filters/global-exception.filter.ts, apps/api/test/integration/student-application.e2e-spec.ts | Duplicate draft attempts now return `409` with `DUPLICATE_APPLICATION` code and structured details payload. | B-01 | BE |
| AF-06 | County form customization settings | Missing | apps/web/app/(admin)/settings/branding/page.tsx (placeholder), apps/web/app/(admin)/settings/page.tsx (placeholder) | Settings UI and backend form customization controls missing | Phase 4 | BE+FE |
| AI-01 | Auto-enqueue AI scoring on submit | Implemented | apps/api/modules/application/application-submission.service.ts, apps/api/queue/queue.service.ts, apps/api/queue/processors/ai-scoring.processor.ts, apps/api/test/integration/review-ai.e2e-spec.ts | Submission now enqueues `ai-scoring` jobs and records queue lifecycle timeline events without blocking successful submission. | B-02 | BE |
| AI-02 | AI scoring dimensions and 0-100 breakdown | Implemented | apps/api/modules/internal/internal.controller.ts, apps/api/modules/internal/internal-application-query.service.ts, apps/api/modules/internal/dto/ingest-ai-score.dto.ts, apps/api/modules/ai/ai-score.service.ts, apps/ai-scoring/scoring/pipeline.py, apps/api/test/integration/review-ai.e2e-spec.ts | End-to-end submit -> AI service -> internal ingest now persists full 0-100 score and dimension breakdown for reviewer consumption. | B-02 | BE+AI |
| AI-03 | Score card visible only to ward/finance/county roles | Implemented | apps/api/modules/ai/ai.controller.ts | Role scope appears correct; validate with security regression tests | Phase 7 validation | BE |
| AI-04 | Anomaly flags surfaced | Implemented | apps/api/modules/internal/dto/ingest-ai-score.dto.ts, apps/api/modules/ai/ai-score.service.ts, apps/web/components/application/ai-score-card.tsx, apps/api/test/integration/review-ai.e2e-spec.ts, apps/api/test/integration/review-ai-failure.e2e-spec.ts | Anomaly flags now flow from queue-triggered scoring into persisted score cards and remain visible on reviewer score surfaces, with explicit failed-scoring lifecycle coverage. | B-02 | BE+FE |
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
- These have been added to the implementation plan addendum and should be maintained there going forward.

## Suggested Execution Order Update

For strict ordering of the remaining `Partial` and `Missing` rows, use `Docs/10-FUNCTIONAL-CLOSURE-BACKLOG.md`. The list below remains a phase-oriented view rather than the detailed dependency queue.

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
