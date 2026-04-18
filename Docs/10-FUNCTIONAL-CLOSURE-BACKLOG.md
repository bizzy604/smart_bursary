# KauntyBursary Functional Closure Backlog

Status: In Progress (B-01 completed, B-02 completed, B-03 completed, B-04 completed, B-05 completed, B-06 completed, B-07 completed, B-08 completed, O-01 completed)  
Last Updated: 2026-04-18  
Source Inputs: `Docs/01-PRD.md`, `Docs/08-IMPLEMENTATION-PLAN.md`, `Docs/09-PRD-TRACEABILITY-MATRIX.md`

## Objective

Provide one strict, dependency-ordered backlog for every remaining PRD functional requirement currently marked `Partial` or `Missing`.

This backlog supersedes any assumption that the next item should be chosen only from the original phase labels. Original phase labels remain useful for provenance, but execution should now follow the order in this document.

## Ordering Rules

1. Work one backlog item at a time.
2. Do not start an item until every dependency listed for it is complete.
3. On completion of each item, update `Docs/09-PRD-TRACEABILITY-MATRIX.md` with evidence paths and status changes.
4. Validation must cover all touched API, web, async, and document/report surfaces.
5. W6 and P7 hardening may continue only when they do not obscure functional closure work.

## Strict Queue

| Order | Backlog Item | PRD IDs Closed | Why This Comes Next | Depends On |
|---|---|---|---|---|
| B-01 | Application data fidelity and duplicate semantics | `SP-02`, `SP-04`, `AF-01`, `AF-05` | AI scoring, committee review, exports, and receipts all depend on canonical application data and correct duplicate behavior. | Completed Phase 2A and 2B |
| B-02 | AI scoring trigger, breakdown, and anomaly lifecycle | `AI-01`, `AI-02`, `AI-04` | Review, exports, and anomaly surfaces are not trustworthy until submit-time AI orchestration is complete. | B-01 |
| B-03 | County settings, branding, and scoring-weight UX | `TM-02`, `AF-06`, `AI-05` | Tenant branding and scoring configuration are core county-admin functional controls and should be usable before broader SaaS rollout. | B-02 |
| B-04 | Tenant provisioning and plan-tier gates | `TM-03`, `TM-04` | Full SaaS readiness requires county bootstrap and feature gating, but it should follow stable county settings behavior. | B-03 |
| B-05 | Disbursement execution, receipts, and retry policy | `DB-01`, `DB-02`, `DB-03`, `DB-04` | Reporting and finance workflows depend on real payment execution, retry state, and downloadable receipts. | B-04 |
| B-06 | Reporting and historical analytics completion | `RP-01`, `RP-02`, `RP-03`, `RP-04` | OCOB and ward exports need completed AI and disbursement data before they can be validated against acceptance criteria. | B-05 |
| B-07 | Status-change notification integration | `RW-04` | Notifications should be wired after the main workflow and disbursement transitions are stable, to avoid reworking event emitters. | B-05 |
| B-08 | Isolation, auth, workflow, and audit closure | `TM-01`, `AU-04`, `AU-05`, `AI-06`, `RW-01`, `RW-05` | These are mostly invariant, enforcement, and regression-proof items that should close immediately before release hardening signoff. | B-06, B-07 |

## Backlog Detail

### B-01 - Application Data Fidelity and Duplicate Semantics

Execution Status:
- Completed (2026-04-17)

Completion Evidence:
- `pnpm --filter @smart-bursary/api run build` passed.
- `pnpm --filter @smart-bursary/api run test -- test/integration/student-application.e2e-spec.ts test/integration/student-application-fidelity.e2e-spec.ts test/integration/program-eligibility.e2e-spec.ts` passed (14/14).
- `pnpm --filter @smart-bursary/web run test` passed (16/16).
- `pnpm --filter @smart-bursary/web run typecheck` passed.
- `pnpm --filter @smart-bursary/web run build` passed.
- Form mapping checklist captured in `Docs/B-01-FORM-MAPPING-CHECKLIST.md`.
- Traceability updates applied in `Docs/09-PRD-TRACEABILITY-MATRIX.md` for `SP-02`, `SP-04`, `AF-01`, and `AF-05`.

PRD IDs:
- `SP-02`
- `SP-04`
- `AF-01`
- `AF-05`

Scope:
- Complete formal field mapping from the gazetted county form into the web wizard and API payload model.
- Ensure family, disability, sibling burden, HELB, prior bursary, and related disclosure fields are persisted and surfaced end to end.
- Change duplicate draft/application creation behavior from "return existing record" to explicit conflict semantics with explanation.

Primary Areas:
- `apps/web/app/(student)/apply/[programId]/*`
- `apps/web/store/application-wizard-store.ts`
- `apps/api/modules/application/*`
- `apps/api/modules/profile/*`
- `apps/api/test/integration/student-application*.ts`

Exit Criteria:
- All official required fields are captured and stored.
- Committee- and AI-facing surfaces can read the required family and disclosure fields.
- Duplicate application attempt returns `409` with a clear conflict payload.

Validation:
- Form-field mapping checklist against `Docs/Education-Fund-Application-Form.pdf`
- API integration coverage for full-section persistence and duplicate conflict behavior
- Web typecheck, build, and critical wizard tests

### B-02 - AI Scoring Trigger, Breakdown, and Anomaly Lifecycle

Execution Status:
- Completed (2026-04-17)

Completion Evidence:
- `pnpm --filter @smart-bursary/api run build` passed.
- `pnpm --filter @smart-bursary/api run test -- test/integration/review-ai.e2e-spec.ts test/integration/review-ai-failure.e2e-spec.ts test/integration/student-application.e2e-spec.ts` passed (15/15).
- Submit flow now enqueues `ai-scoring` jobs via `apps/api/queue/queue.service.ts` and `apps/api/modules/application/application-submission.service.ts`.
- Queue processor integration implemented in `apps/api/queue/processors/ai-scoring.processor.ts`.
- Internal AI fetch contract completed with `GET /internal/applications/:id` in `apps/api/modules/internal/internal.controller.ts` and `apps/api/modules/internal/internal-application-query.service.ts`.
- Failure lifecycle visibility validated via `AI_SCORING_FAILED`/`AI_SCORING_QUEUE_FAILED` timeline coverage in `apps/api/test/integration/review-ai-failure.e2e-spec.ts`.

PRD IDs:
- `AI-01`
- `AI-02`
- `AI-04`

Scope:
- Enqueue AI scoring automatically on successful submission.
- Persist score lifecycle state, 0-100 breakdown, and anomaly flags on the application.
- Complete the internal ingest/update loop between NestJS and `apps/ai-scoring`.

Primary Areas:
- `apps/api/modules/application/*`
- `apps/api/modules/ai/*`
- `apps/api/modules/internal/*`
- `apps/api/queue/*`
- `apps/ai-scoring/*`

Exit Criteria:
- Submission enqueues scoring within the accepted time window.
- Ward/county review surfaces receive score breakdown and anomalies for reviewed applications.
- Failure handling is explicit and visible without breaking submission flow.

Validation:
- Submit -> queue -> ingest -> review visibility end-to-end test
- Negative-path coverage for failed or delayed scoring
- API build and integration suite for review/AI paths

### B-03 - County Settings, Branding, and Scoring-Weight UX

Execution Status:
- Completed (2026-04-17)

Completion Evidence:
- `pnpm --filter @smart-bursary/api run build` passed.
- `pnpm --filter @smart-bursary/api run test -- test/integration/tenant-settings.e2e-spec.ts test/integration/review-ai.e2e-spec.ts` passed (10/10).
- `pnpm --filter @smart-bursary/web run test` passed (19/19), including new settings route tests and PDF payload branding coverage.
- `pnpm --filter @smart-bursary/web run typecheck` passed.
- `pnpm --filter @smart-bursary/web run build` passed.
- County settings APIs delivered in `apps/api/modules/tenant/tenant.controller.ts`, `apps/api/modules/tenant/tenant.service.ts`, and `apps/api/modules/tenant/dto/update-settings.dto.ts`.
- County scoring-weight read/update UX completed in `apps/web/app/(admin)/settings/ai-scoring/page.tsx` and `apps/api/modules/ai/ai.controller.ts` (`GET/PATCH /admin/scoring-weights`).
- Branding propagation now updates county-facing UI and generated PDF payloads via `apps/web/components/layout/county-branding-provider.tsx`, `apps/web/lib/application-pdf.tsx`, and `apps/web/app/api/applications/preview/pdf/route.ts`.

PRD IDs:
- `TM-02`
- `AF-06`
- `AI-05`

Scope:
- Replace placeholder county settings pages with working branding, form customization, and AI scoring configuration flows.
- Ensure branding values affect generated PDFs and county-facing surfaces.
- Ensure scoring weight changes persist per county and are reflected in score recalculation paths.

Primary Areas:
- `apps/web/app/(admin)/settings/*`
- `apps/api/modules/tenant/*`
- `apps/api/modules/ai/*`
- Branding consumers in `apps/web/components/layout/*` and PDF generation utilities

Exit Criteria:
- County admins can manage brand profile and approved form customization controls.
- County admins can manage scoring weights through the UI.
- Branding values flow into PDFs and relevant UI surfaces.

Validation:
- Web component/route tests for settings pages
- API integration tests for county isolation and settings writes
- PDF regression checks for branding application

### B-04 - Tenant Provisioning and Plan-Tier Gates

Execution Status:
- Completed (2026-04-17)

Completion Evidence:
- `pnpm --filter @smart-bursary/api run build` passed.
- `pnpm --filter @smart-bursary/api run test -- --runInBand test/integration/tenant-provisioning-plan-gates.e2e-spec.ts` passed (5/5).
- `pnpm --filter @smart-bursary/api run test -- --runInBand test/integration/tenant-settings.e2e-spec.ts test/integration/review-ai.e2e-spec.ts` passed (10/10).
- Platform-operator provisioning routes implemented in `apps/api/modules/tenant/tenant-provisioning.controller.ts`:
	- `GET /platform/tenants/status`
	- `GET /platform/tenants`
	- `GET /platform/tenants/:id`
	- `POST /platform/tenants`
	- `PATCH /platform/tenants/:id/plan-tier`
- Provisioning orchestration now creates county tenant records, seeds wards, and bootstraps a county admin in `apps/api/modules/tenant/provisioning.service.ts`.
- Plan-tier guard/decorator added in `apps/api/common/guards/plan-tier.guard.ts` and `apps/api/common/decorators/plan-tier.decorator.ts`, with enforcement applied to:
	- `apps/api/modules/tenant/tenant.controller.ts` (`STANDARD`+ for county settings)
	- `apps/api/modules/ai/ai.controller.ts` (`ENTERPRISE` for scoring-weight admin)

PRD IDs:
- `TM-03`
- `TM-04`

Scope:
- Implement platform-operator provisioning APIs and services.
- Seed county, ward registry data, and an initial super admin/operator path per tenant.
- Enforce feature availability by `planTier` at API level.

Primary Areas:
- `apps/api/modules/tenant/*`
- Provisioning seed/runtime utilities
- Feature-gated modules such as settings, reporting, and advanced AI controls

Exit Criteria:
- Platform operator provisions a new county through supported APIs/workflow.
- Feature-gated endpoints reject access when the county plan does not allow them.

Validation:
- Provisioning integration test for a fresh tenant
- Feature gate regression tests across at least one restricted and one enterprise-only capability

### B-05 - Disbursement Execution, Receipts, and Retry Policy

Execution Status:
- Completed (2026-04-17)

Completion Evidence:
- `pnpm --filter @smart-bursary/api run build` passed.
- `pnpm --filter @smart-bursary/api run test -- --runInBand test/integration/disbursement.e2e-spec.ts test/integration/disbursement-reporting.e2e-spec.ts test/integration/disbursement-execution.e2e-spec.ts` passed (11/11).
- Disbursement execution lifecycle now uses dedicated execution/queue/query/export services in `apps/api/modules/disbursement/disbursement-execution.service.ts`, `apps/api/modules/disbursement/disbursement-queue.service.ts`, `apps/api/modules/disbursement/disbursement-query.service.ts`, and `apps/api/modules/disbursement/disbursement-export.service.ts`.
- M-Pesa adapter now executes mock/real B2C calls via `apps/api/modules/disbursement/mpesa.service.ts`, including retry-trigger failure simulation for integration coverage.
- Receipt output now generates true PDF bytes via `apps/api/modules/disbursement/receipt.service.ts`, exposed by `GET /disbursements/:disbursementId/receipt` and `GET /disbursements/application/:applicationId/receipt`.
- Finance batch export endpoint delivered at `POST /disbursements/batch/eft`, and reporting awarded totals now include both `APPROVED` and `DISBURSED` states in `apps/api/modules/reporting/reporting.service.ts`.

PRD IDs:
- `DB-01`
- `DB-02`
- `DB-03`
- `DB-04`

Scope:
- Complete real M-Pesa B2C execution flow and persisted transaction status.
- Finish EFT/RTGS export endpoints and operator workflow.
- Generate downloadable receipt PDFs.
- Add retry policy, attempt counters, terminal failure state, and finance alerting.

Primary Areas:
- `apps/api/modules/disbursement/*`
- Student receipt download surface in `apps/web`
- Queue/retry infrastructure and alert hooks

Exit Criteria:
- Finance officer can trigger real disbursement and observe resulting transaction status.
- RTGS exports are downloadable in the expected format.
- Receipt PDFs are downloadable by the student.
- Failed disbursements retry up to 3 times and then escalate.

Validation:
- Disbursement integration tests covering success, retry, and terminal failure
- Receipt PDF generation tests
- Export format snapshots

### B-06 - Reporting and Historical Analytics Completion

Execution Status:
- Completed (2026-04-17)

Completion Evidence:
- `pnpm --filter @smart-bursary/api run build` passed.
- `pnpm --filter @smart-bursary/api run test -- --runInBand --runTestsByPath test/integration/reporting-analytics.e2e-spec.ts` passed (4/4).
- `pnpm --filter @smart-bursary/web run typecheck` passed.
- `pnpm --filter @smart-bursary/web run build` passed.
- Reporting API now exposes dashboard/OCOB/ward-summary/trends and export endpoints through `apps/api/modules/reporting/reporting.controller.ts`, `apps/api/modules/reporting/reporting.service.ts`, and `apps/api/modules/reporting/reporting-analytics.service.ts`.
- County dashboard now consumes live `/reports/dashboard` data with periodic refresh in `apps/web/app/(admin)/county/dashboard/page.tsx`.
- County OCOB and ward export pages now consume live datasets and backend CSV/PDF exports via `apps/web/app/(admin)/county/reports/ocob/page.tsx`, `apps/web/app/(admin)/ward/reports/page.tsx`, and `apps/web/lib/reporting-api.ts`.
- Historical trend filters (year/program/ward/education level) are implemented against `/reports/trends` in `apps/web/app/(admin)/county/reports/page.tsx`.

PRD IDs:
- `RP-01`
- `RP-02`
- `RP-03`
- `RP-04`

Scope:
- Finish near-real-time dashboard refresh behavior.
- Complete OCOB-ready report outputs.
- Ensure ward exports include AI score, recommendation, and reviewer metadata.
- Add historical trend filters by year, program, ward, and education level.

Primary Areas:
- `apps/api/modules/reporting/*`
- `apps/web/app/(admin)/county/reports/*`
- `apps/web/app/(admin)/ward/reports/*`

Exit Criteria:
- Dashboard, OCOB export, ward export, and trend views meet PRD acceptance intent.
- Required filters and report fields are present and validated.

Validation:
- Reporting API contract tests
- Export snapshot/content validation
- Web build/typecheck and route tests for reporting states

### B-07 - Status-Change Notification Integration

Execution Status:
- Completed (2026-04-18)

Completion Evidence:
- `pnpm --filter @smart-bursary/api exec prisma migrate deploy` passed, applying `20260418083000_b07_notification_delivery`.
- `pnpm --filter @smart-bursary/api run build` passed.
- `pnpm --filter @smart-bursary/api run test -- --runInBand --runTestsByPath test/integration/notification-status-change.e2e-spec.ts` passed (2/2).
- `pnpm --filter @smart-bursary/api run test -- --runInBand --runTestsByPath test/integration/disbursement-execution.e2e-spec.ts` passed (3/3).
- Notification module now provides queue-backed lifecycle dispatch and audit query APIs in `apps/api/modules/notification/notification.module.ts`, `apps/api/modules/notification/notification-lifecycle.service.ts`, and `apps/api/modules/notification/notification.controller.ts`.
- SMS delivery jobs now process through queue adapter/worker flow via `apps/api/queue/queue.service.ts` and `apps/api/queue/processors/sms.processor.ts`.
- Delivery records are persisted in Prisma through `apps/api/prisma/schema.prisma` and migration `apps/api/prisma/migrations/20260418083000_b07_notification_delivery/migration.sql`.
- Submission, review, and disbursement transitions now emit notification jobs from `apps/api/modules/application/application-submission.service.ts`, `apps/api/modules/review/ward-review.service.ts`, `apps/api/modules/review/county-review.service.ts`, `apps/api/modules/disbursement/disbursement-queue.service.ts`, and `apps/api/modules/disbursement/disbursement.service.ts`.

PRD IDs:
- `RW-04`

Scope:
- Implement SMS delivery service and queue-backed notification dispatch.
- Emit notifications for submission, review transitions, final decisions, and disbursement-related status changes.
- Persist delivery records for audit/support visibility.

Primary Areas:
- `apps/api/modules/notification/*`
- Workflow transition points in `application`, `review`, and `disbursement`

Exit Criteria:
- Every required status transition emits an SMS job and delivery record.
- Failures are visible and do not block the underlying workflow transaction.

Validation:
- Integration tests for status transitions and notification job creation
- Delivery failure and retry-path coverage

### B-08 - Isolation, Auth, Workflow, and Audit Closure

Execution Status:
- Completed (2026-04-18)

Completion Evidence:
- `pnpm --filter @smart-bursary/api run build` passed.
- `pnpm --filter @smart-bursary/api run test -- --runInBand --runTestsByPath test/integration/b08-security-audit.e2e-spec.ts` passed (3/3).
- `pnpm --filter @smart-bursary/api run test -- --runInBand --runTestsByPath test/integration/review-ai.e2e-spec.ts` passed (5/5).
- `pnpm --filter @smart-bursary/api run test -- --runInBand --runTestsByPath test/integration/reporting-analytics.e2e-spec.ts` passed (4/4).
- Explicit RBAC decorators were added for student-only application/document routes in `apps/api/modules/application/application.controller.ts` and `apps/api/modules/document/document.controller.ts`.
- Workflow audit retrieval APIs were implemented in `apps/api/modules/application/application-audit.service.ts` and exposed by `GET /applications/:id/timeline` and `GET /applications/:id/review-notes`.
- Ward and county isolation checks are enforced for audit retrieval and validated by cross-ward/cross-county assertions in `apps/api/test/integration/b08-security-audit.e2e-spec.ts`.
- County-wide reporting access was narrowed to county-admin and finance-officer roles in `apps/api/modules/reporting/reporting.controller.ts`.

PRD IDs:
- `TM-01`
- `AU-04`
- `AU-05`
- `AI-06`
- `RW-01`
- `RW-05`

Scope:
- Close DB-level tenant/ward isolation guarantees and prove them with regression tests.
- Expand RBAC coverage across the endpoint matrix.
- Add explicit safeguards ensuring AI cannot change application outcomes.
- Complete workflow state-machine and audit-note visibility invariants.

Primary Areas:
- `apps/api/common/guards/*`
- `apps/api/modules/review/*`
- `apps/api/modules/application/*`
- `apps/api/prisma/migrations/*`
- Security and workflow integration tests

Exit Criteria:
- RLS or equivalent DB-level isolation guarantees are implemented and verified.
- Role matrix tests and ward-scope regression tests are green.
- Timeline and note visibility satisfy PRD audit expectations.
- No AI path can auto-approve or auto-reject an application.

Validation:
- Security/regression test pack
- Workflow state-machine tests
- Audit trail query and note-visibility tests

## Operational Follow-On Item (Completed)

The following item is not one of the PRD matrix `Partial` or `Missing` rows, but was completed as an operational closure slice after B-08:

| Item | Description | Completion Evidence |
|---|---|---|
| O-01 | County Admin program management UI for create, edit, publish, and close flows | Implemented in `apps/web/lib/admin-programs.ts`, `apps/web/app/(admin)/settings/programs/page.tsx`, `apps/web/app/(admin)/settings/programs/new/page.tsx`, `apps/web/app/(admin)/settings/programs/[id]/page.tsx`, and linked from `apps/web/app/(admin)/settings/page.tsx`; validated by `pnpm --filter @smart-bursary/web run typecheck` and `pnpm --filter @smart-bursary/web run build` |

## Recommended Immediate Next Action

Proceed to release hardening tracks (`W6` frontend hardening and `Phase 7` backend hardening/release readiness) now that strict functional closure backlog items `B-01` through `B-08` are complete.
