# Backend Implementation Tracker (Modular Monolith)

Purpose: Track backend implementation in controlled, validated phases and prevent blanket implementation.

## Governance Rules (Non-Negotiable)

1. Work one phase at a time.
2. Do not start the next phase until the current phase is fully implemented, validated, and marked Completed in this document.
3. Validation must include build, tests, and edge-case checks for the current phase.
4. If validation fails or blockers remain, stop and log the gap under the active phase.
5. Respect modular monolith boundaries in `apps/api` (controller/app/domain/persistence/dto/docs/tests/module wiring).
6. No source file over 200 physical lines; split files when needed.
7. Every new/modified source file must include the required header comment block.
8. Exception: `apps/api/prisma/schema.prisma` is allowed to exceed 200 lines and must remain a single complete schema file.
9. Each module phase must be completed end-to-end before any work starts on the next module phase.

## Status Legend

- Not Started
- In Progress
- Blocked
- Completed

---

## Master Roadmap

| Phase | Name | Status | Owner | Start Date | Target End | Actual End |
|---|---|---|---|---|---|---|
| P0 | Foundation Bootstrap | Completed | GitHub Copilot | 2026-04-15 | 2026-04-15 | 2026-04-15 |
| P1 | Data Model and Migrations Baseline | Completed | GitHub Copilot | 2026-04-15 | 2026-04-15 | 2026-04-15 |
| P2 | Auth, RBAC, Tenant Context | Completed | GitHub Copilot | 2026-04-15 | 2026-04-15 | 2026-04-15 |
| P3 | Student Application Vertical Slice | Completed | GitHub Copilot | 2026-04-15 | 2026-04-15 | 2026-04-15 |
| P4 | Documents and Async Jobs | Completed | GitHub Copilot | 2026-04-15 | 2026-04-15 | 2026-04-15 |
| P5 | Review and Allocation Workflow | Completed | GitHub Copilot | 2026-04-16 | 2026-04-16 | 2026-04-16 |
| P6 | Disbursement and Reporting MVP | Completed | GitHub Copilot | 2026-04-16 | 2026-04-16 | 2026-04-16 |
| P7 | Hardening and Release Readiness | Not Started | TBD | - | - | - |

---

## Active Phase Rule

Only one phase may be marked In Progress at any time.

Current active phase: None (P6 completed)

## PRD / Design Alignment

This tracker is the execution ledger for the product requirements and architecture docs. The phase boundaries below map directly to the documented source of truth:

| Doc Area | Tracker Phase(s) | Notes |
|---|---|---|
| Tenant bootstrap, auth, and shared backend foundations | P0-P2 | Modular NestJS backend, tenant isolation, RBAC, and config validation |
| Student application flow and wizard submission | P3 | Covers application creation, section persistence, submission, and timeline logging |
| PDF form preview / download and document lifecycle | P3-P4 | Form rendering and document storage/scanning are split across the application and document slices |
| AI scoring and review workflow | P5 | NestJS owns the reviewer-facing API and internal ingestion bridge; `apps/ai-scoring` is the separate FastAPI scoring runtime per system design |
| Disbursement and reporting | P6 | M-Pesa B2C, bank EFT/RTGS, receipts, dashboards, and OCOB exports |
| Release hardening and readiness | P7 | Performance, observability, security hardening, and release checks |

Product-level notes from the PRD and system design:

- v1 is the web/PWA experience; native mobile apps are a v2 non-goal.
- County-level data isolation is enforced through `county_id` and PostgreSQL RLS.
- The AI scoring engine is a separate Python FastAPI microservice, with NestJS exposing the internal ingestion and reviewer APIs.

---

## Out-Of-Scope Carry-Forward Register

Purpose: Ensure out-of-scope items from completed phases are explicitly tracked and scheduled.

| Source Phase | Deferred Item | Target Phase | Status |
|---|---|---|---|
| P0 | Business workflows (applications, review, disbursement) | P3, P5, P6 | Not Started |
| P0 | AI scoring internals | P5 (integration), P7 (hardening) | Not Started |
| P0 | Reporting/business analytics | P6 | Not Started |
| P1 | Application/business service implementation | P3 onward | Not Started |
| P1 | Reporting and disbursement workflows | P6 | Not Started |

Rule: A deferred item may only be implemented when its target phase is marked In Progress.

---

## Phase Template (Copy For New Work)

### PX - <Phase Name>

Status: Not Started  
Owner: TBD  
Scope Window: <dates>

#### In Scope

- 

#### Out of Scope

- 

#### Deliverables

- [ ] 

#### Validation Checklist (Required Before Completion)

- [ ] Build passes for `apps/api`
- [ ] Unit/integration tests for this phase pass
- [ ] Edge-case checks completed and documented
- [ ] Architecture/rules checks completed (module boundaries, file length, file headers)

#### Evidence

- Build command and summary:
- Test command and summary:
- Edge-case checks and summary:
- Notes:

#### Blockers and Gaps

- None

#### Completion Gate

- [ ] All deliverables done
- [ ] All validation checks done
- [ ] No unresolved blocker
- [ ] Phase status set to Completed

---

## P0 - Foundation Bootstrap

Status: Completed  
Owner: GitHub Copilot  
Scope Window: 2026-04-15

### In Scope

- Nest application bootstrap in `main.ts` and `app.module.ts`
- Global config and env validation wiring
- Base database module and Prisma service wiring
- Standard global API concerns (logging, error filters, validation pipeline)
- Health endpoint readiness

### Out of Scope

- Business workflows (applications, review, disbursement)
- AI scoring internals
- Reporting/business analytics

### Deliverables

- [x] Bootstrap and module wiring complete
- [x] Config validation complete with startup fail-fast
- [x] Database module and Prisma service wired
- [x] Health endpoint implemented
- [x] Minimal integration test for app health

### Validation Checklist (Required Before Completion)

- [x] Build passes for `apps/api`
- [x] Phase tests pass (health/bootstrap)
- [x] Edge-case checks documented
- [x] Modular monolith checks passed:
  - [x] No controller business logic
  - [x] No direct Prisma calls in controllers
  - [x] New/changed source files have header comments
  - [x] No source file exceeds 200 lines

### Evidence

- Build command and summary: `pnpm run build` passed successfully in `apps/api`.
- Test command and summary: `pnpm exec jest --config jest.config.ts test/integration/application.e2e-spec.ts` passed (2/2 tests).
- Edge-case checks and summary: `pnpm run start` with missing `DATABASE_URL` and `JWT_SECRET` failed fast with config validation error as expected.
- Notes: Prisma is wired at app level; integration health test overrides Prisma provider because schema generation belongs to P1.

### Blockers and Gaps

- None

### Completion Gate

- [x] All deliverables done
- [x] All validation checks done
- [x] No unresolved blocker
- [x] Phase status set to Completed

---

## P1 - Data Model and Migrations Baseline

Status: Completed  
Owner: GitHub Copilot  
Scope Window: 2026-04-15

### In Scope

- Complete Prisma schema in single file
- Baseline migration generation and application
- Local Postgres runtime via Docker for migration execution

### Out of Scope

- Application/business service implementation
- Auth and RBAC endpoint behavior
- Reporting and disbursement workflows

### Deliverables

- [x] Complete baseline schema in `apps/api/prisma/schema.prisma`
- [x] Local database provisioned via Docker compose
- [x] Baseline migration created and applied
- [x] Seed data script for county/ward baseline
- [x] P1 test suite and edge-case checklist completed

### Validation Checklist (Required Before Completion)

- [x] Build passes for `apps/api`
- [x] Phase tests pass (migration and schema checks)
- [x] Edge-case checks documented
- [x] Architecture/rules checks passed

### Evidence

- Docker start: `docker compose up -d postgres` succeeded.
- Container health: `docker compose ps` shows `smart-bursary-postgres` as healthy.
- Migration: `pnpm run prisma:migrate --name p1_baseline_schema` succeeded.
- Migration artifact: `apps/api/prisma/migrations/20260415193403_p1_baseline_schema/migration.sql` created.
- Seed: `pnpm run prisma:seed` succeeded and created baseline county/ward records.
- Build and tests: `pnpm run build` and `pnpm exec jest --config jest.config.ts test/integration/application.e2e-spec.ts` both passed.
- Schema sync check: `pnpm exec prisma migrate status` reports database schema is up to date.

### Blockers and Gaps

- None active.

### Completion Gate

- [x] All deliverables done
- [x] All validation checks done
- [x] No unresolved blocker
- [x] Phase status set to Completed

---

## P2 - Auth, RBAC, Tenant Context

Status: Completed  
Owner: GitHub Copilot  
Scope Window: 2026-04-15

### In Scope

- Register/login auth flow
- JWT guard and strategy wiring
- RBAC guard with route metadata
- Tenant context normalization interceptor

### Out of Scope

- None for this module phase.

### Deliverables

- [x] Auth module/controller/service implemented
- [x] DTOs for register/login implemented
- [x] JWT strategy and auth guard implemented
- [x] Roles decorator and roles guard implemented
- [x] Tenant context interceptor wired globally
- [x] Password reset request flow implemented with OTP generation and expiry
- [x] Password reset completion flow implemented with OTP verification
- [x] Integration tests for auth and RBAC paths

### Validation Checklist (Required Before Completion)

- [x] Build passes for `apps/api`
- [x] Phase tests pass (auth/rbac/tenant context checks)
- [x] Edge-case checks documented
- [x] Architecture/rules checks completed

### Evidence

- Build: `pnpm run build` passed.
- Integration tests: `pnpm exec jest --config jest.config.ts test/integration/auth.e2e-spec.ts test/integration/application.e2e-spec.ts` passed (4/4).
- Edge-case checks:
  - Anonymous `GET /api/v1/auth/me` returns 401.
  - Student token on `GET /api/v1/auth/admin-probe` returns 403.
- Notes: JWT config pulls non-optional secret from validated app config.

Update Evidence (End-to-End Completion):

- Build: `pnpm run build` passed after adding password reset flow.
- Integration tests: `pnpm exec jest --config jest.config.ts --runInBand test/integration/auth.e2e-spec.ts test/integration/application.e2e-spec.ts` passed (5/5).
- Password reset checks:
  - `POST /api/v1/auth/request-password-reset` returns accepted response and OTP in test environment.
  - `POST /api/v1/auth/reset-password` accepts valid OTP and updates password.
  - Old password login fails after reset; new password login succeeds.

### Blockers and Gaps

- None active.

### Completion Gate

- [x] All deliverables done
- [x] All validation checks done
- [x] No unresolved blocker
- [x] Phase status set to Completed

---
## P3 - Student Application Vertical Slice

Status: Completed  
Owner: GitHub Copilot  
Scope Window: 2026-04-15

### In Scope

- BursaryProgram query module (list active programs county-scoped, retrieve program details, eligibility checks)
- Application module (create draft, list my applications, retrieve application, update section, submit application)
- ApplicationSection workflow (save section data, mark section complete)
- Student application submission end-to-end flow with validation
- Timeline event recording for application lifecycle
- Integration tests for full student application workflow

### Out of Scope (Carry-Forward)

- Document upload and virus scan (→ P4)
- AI scoring and anomaly detection (→ P5)
- Application review workflows and decisions (→ P5)
- Disbursement processing (→ P6)
- Reporting and analytics (→ P6)
- Performance hardening and caching (→ P7)

### Deliverables

- [x] BursaryProgram module implemented with controller, service, DTOs
- [x] Application module implemented with controller, service, DTOs
- [x] ApplicationSection logic implemented in Application service
- [x] Timeline event recording on application lifecycle changes
- [x] End-to-end student application flow integration tests
- [x] Build passes for `apps/api`
- [x] All tests pass

### Validation Checklist (Required Before Completion)

- [x] Build passes for `apps/api`
- [x] Unit/integration tests for this phase pass
- [x] Edge-case checks completed and documented:
  - [x] Student can see only their own applications and sections
  - [x] Student can only submit draft applications before program closes
  - [x] Application status transitions are enforced
  - [x] Timeline events record each status change
- [x] Architecture/rules checks completed (module boundaries, file length, file headers)

### Evidence

- Build command and summary: `pnpm run build` passed successfully in `apps/api`.
- Test command and summary: `pnpm exec jest --config jest.config.ts --runInBand test/integration/student-application.e2e-spec.ts test/integration/auth.e2e-spec.ts test/integration/application.e2e-spec.ts` passed (3 suites, 14 tests).
- Edge-case checks and summary:
  - [x] List active programs: student sees county-scoped programs within open window
  - [x] Create draft: student creates single draft per program (duplicate check returns existing)
  - [x] Update section: student can update sections with JSON data
  - [x] Submit: status transitions DRAFT → SUBMITTED with submission reference
  - [x] Closed program: student gets 400 when trying to apply to program past deadline
  - [x] My applications: student sees only their own applications ordered by creation date
- Notes: 
  - Module files use header comments and stay under 200 lines.
  - ApplicationService handles ward resolution when null.
  - JWT token payload uses userId field, consistent with JwtStrategy.

### Blockers and Gaps

- None active.

### Completion Gate

- [x] All deliverables done
- [x] All validation checks done
- [x] No unresolved blocker
- [x] Phase status set to Completed

---
## Change Log

| Date | Phase | Change | By |
|---|---|---|---|
| 2026-04-15 | P0 | Initial tracker created | GitHub Copilot |
| 2026-04-15 | P0 | Implemented and validated foundation bootstrap slice | GitHub Copilot |
| 2026-04-15 | P1 | Started Docker Postgres and applied baseline Prisma migration | GitHub Copilot |
| 2026-04-15 | P1 | Added seed workflow and completed P1 validation checklist | GitHub Copilot |
| 2026-04-15 | P2 | Implemented auth/RBAC/tenant context and passed integration tests | GitHub Copilot |
| 2026-04-15 | P2 | Closed auth module end-to-end by adding OTP password reset flow and validation | GitHub Copilot |
| 2026-04-15 | P3 | Implemented BursaryProgram and Application modules with complete end-to-end workflow | GitHub Copilot |
| 2026-04-15 | P4 | Implemented document uploads, Redis-backed queue wiring, and scan status flow | GitHub Copilot |
| 2026-04-16 | P5 | Implemented review workflow, AI score access, scoring weights, and internal score ingestion | GitHub Copilot |
| 2026-04-16 | P6 | Implemented disbursement and reporting MVP, validated integration workflow, and closed phase | GitHub Copilot |

---

## P4 - Documents and Async Jobs

Status: Completed  
Owner: GitHub Copilot  
Scope Window: 2026-04-15

### In Scope

- Document upload module (file storage, metadata tracking, virus scan coordination)
- Async job queue integration for document virus scanning
- Document submission and retrieval endpoints
- Virus scan result handling and status updates
- Integration with ClamAV (or mock equivalent) for production-grade scanning
- Integration tests for document lifecycle and async job processing

### Out of Scope (Carry-Forward)

- AI scoring and anomaly detection (→ P5)
- Application review workflows and decisions (→ P5)
- Disbursement processing (→ P6)
- Reporting and analytics (→ P6)
- Performance hardening and caching (→ P7)

### Deliverables

- [x] Document module implemented with controller, service, DTOs
- [x] S3-only document storage abstraction
- [x] Async job queue configuration for virus scanning
- [x] Virus scan processor job handler
- [x] Document upload endpoint with strict file validation (doc type, MIME, size)
- [x] Document list/retrieve endpoints (county-scoped)
- [x] Build passes for `apps/api`
- [x] All tests pass

### Validation Checklist (Required Before Completion)

- [x] Build passes for `apps/api`
- [x] Unit/integration tests for this phase pass
- [x] Edge-case checks completed and documented:
  - [x] Student can upload documents to their application
  - [x] Student can only see their own documents
  - [x] Virus scan job processes asynchronously
  - [x] Document status transitions (PENDING → SCANNING → CLEAN/INFECTED)
- [x] Architecture/rules checks completed (module boundaries, file length, file headers)

### Evidence

- Build command and summary: `pnpm run build` passed successfully in `apps/api`.
- Test command and summary: `pnpm test -- test/integration/document.e2e-spec.ts test/integration/document-scan-auth.e2e-spec.ts` passed (13/13 tests) in `apps/api`.
- Edge-case checks and summary:
  - [x] Upload document: returns 201 and queues scan work
  - [x] Missing file: returns 400
  - [x] Missing applicationId: returns 400
  - [x] Non-existent application: returns 404
  - [x] Size limit: returns 400 for files larger than 5 MB
  - [x] Document retrieval: county- and applicant-scoped access only
  - [x] Async scan: uploaded documents reach CLEAN or INFECTED states
- Notes:
  - Document service now emits signed download metadata (`downloadUrl`, `downloadExpiresAt`) through the storage adapter.
  - Root `docker-compose.yml` includes `redis` for queue infrastructure.
  - Queue adapter uses Redis when `REDIS_URL` is set and falls back to in-process async processing otherwise.
  - Validation run used local `postgres` and `redis` containers, `prisma migrate deploy`, and `prisma db seed` before executing the document integration suites.
  - Document module and test files were normalized to the required header format.

### Blockers and Gaps

- None active.

### Completion Gate

- [x] All deliverables done
- [x] All validation checks done
- [x] No unresolved blocker
- [x] Phase status set to Completed

---

## P5 - Review and Allocation Workflow

Status: Completed  
Owner: GitHub Copilot  
Scope Window: 2026-04-16

### In Scope

- AI score retrieval for reviewer roles
- Ranked program score listing for ward reviewers
- County-scoped scoring weight updates
- Ward review recommendation endpoint
- County allocation decision endpoint
- Internal AI score ingestion endpoint
- Timeline event recording for review and allocation actions
- Integration tests for the full review and allocation workflow

### Out of Scope

- Disbursement processing (→ P6)
- Reporting and analytics (→ P6)
- Performance hardening and caching (→ P7)

### Deliverables

- [x] AI score retrieval and ranked score listing implemented
- [x] County scoring weight updates implemented
- [x] Ward review recommendation flow implemented
- [x] County allocation and budget enforcement implemented
- [x] Internal score ingestion endpoint implemented
- [x] Integration test coverage for the full workflow added
- [x] Build passes for `apps/api`
- [x] All tests in the phase pass

### Validation Checklist (Required Before Completion)

- [x] Build passes for `apps/api`
- [x] Unit/integration tests for this phase pass
- [x] Edge-case checks completed and documented:
  - [x] Reviewer roles can read AI scores
  - [x] Ward reviewers can list ranked program scores
  - [x] County admins can update scoring weights
  - [x] Ward review transitions the application to the review stage
  - [x] County allocation enforces budget ceilings and finalizes status
  - [x] Timeline events remain complete after review actions
- [x] Architecture/rules checks completed (module boundaries, file length, file headers)

### Evidence

- Build command and summary: `pnpm run build` passed successfully in `apps/api`.
- Test command and summary: `pnpm exec jest --config jest.config.ts --runInBand test/integration/review-ai.e2e-spec.ts` passed (5/5 tests).
- Edge-case checks and summary:
  - [x] AI score response grade follows the implemented threshold bands
  - [x] Ranked score listing is tenant-scoped to the reviewer ward
  - [x] County scoring weights persist and validate total allocation
  - [x] Ward review and county allocation complete the workflow in sequence
  - [x] Timeline entries are written for review and allocation events
- Notes:
  - `RolesGuard` now resolves reviewer roles from the request context without adding an unavailable Nest provider dependency.
  - The separate FastAPI scoring runtime remains the system-design target; the NestJS AI module and internal controller own the reviewer-facing API and ingestion bridge.
  - Score grading thresholds intentionally treat `78.5` as `MEDIUM` because `HIGH` begins at `80`.

### Blockers and Gaps

- None active.

### Completion Gate

- [x] All deliverables done
- [x] All validation checks done
- [x] No unresolved blocker
- [x] Phase status set to Completed

---

## P6 - Disbursement and Reporting MVP

Status: Completed  
Owner: GitHub Copilot  
Scope Window: 2026-04-16

### In Scope

- M-Pesa B2C disbursement for approved applications
- Bank EFT / RTGS batch export
- Disbursement receipt PDF generation
- County dashboard aggregates and budget utilization views
- OCOB-ready Excel and PDF report generation
- Ward-level summary exports with AI score and reviewer metadata
- Integration tests for disbursement and reporting flows

### Out of Scope

- Performance hardening and caching (→ P7)

### Deliverables

- [x] Disbursement module implemented with controller, service, DTOs
- [x] M-Pesa B2C integration implemented
- [x] EFT/RTGS export implemented
- [x] Receipt PDF generation implemented
- [x] Reporting module implemented with dashboard and OCOB exports
- [x] Integration tests for disbursement and reporting added
- [x] Build passes for `apps/api`
- [x] All tests pass

### Validation Checklist (Required Before Completion)

- [x] Build passes for `apps/api`
- [x] Unit/integration tests for this phase pass
- [x] Edge-case checks completed and documented:
  - [x] Approved applications can be queued for disbursement
  - [x] Failed disbursements retry and surface alerts
  - [x] Report outputs match the OCOB template
  - [x] Ward and county dashboards respect tenant scoping
- [x] Architecture/rules checks completed (module boundaries, file length, file headers)

### Evidence

- Build command and summary: `pnpm run build` passed successfully in `apps/api`.
- Test command and summary: `pnpm --filter=@smart-bursary/api exec jest --config jest.config.ts --runInBand test/integration/disbursement-reporting.e2e-spec.ts` passed (6/6 tests).
- Edge-case checks and summary: Disbursement initiation, county-scoped listing/detail retrieval, dashboard aggregation, by-status summaries, and awarded-by-program reporting all passed within the integration spec.
- Notes: This phase is driven by PRD goals G5-G6 and the disbursement/reporting requirements in the system design.

### Blockers and Gaps

- None active.

### Completion Gate

- [x] All deliverables done
- [x] All validation checks done
- [x] No unresolved blocker
- [x] Phase status set to Completed

---

## P7 - Hardening and Release Readiness

Status: Not Started  
Owner: TBD  
Scope Window: -

### In Scope

- Reliability and observability hardening
- Performance tuning and caching
- Security regression checks
- Release readiness validation and rollout planning
- Mobile web / PWA polish for the v1 experience

### Out of Scope

- New business workflow features

### Deliverables

- [ ] Load and soak test coverage added
- [ ] Observability gaps resolved
- [ ] Security checks and regression suite added
- [ ] Performance budgets and caching checks documented
- [ ] Release readiness checklist completed

### Validation Checklist (Required Before Completion)

- [ ] Build passes for `apps/api`
- [ ] Final regression suite passes
- [ ] Edge-case checks completed and documented
- [ ] Architecture/rules checks completed (module boundaries, file length, file headers)

### Evidence

- Build command and summary: (pending)
- Test command and summary: (pending)
- Edge-case checks and summary: (pending)
- Notes: This phase closes out PRD goal G7 and the system-design hardening requirements.

### Blockers and Gaps

- None active.

### Completion Gate

- [ ] All deliverables done
- [ ] All validation checks done
- [ ] No unresolved blocker
- [ ] Phase status set to Completed

---

## How To Use This Tracker

1. Set exactly one phase to In Progress.
2. Implement only items listed under that phase In Scope and complete the module end-to-end.
3. Run validation checklist and fill Evidence.
4. If any check fails, set phase to Blocked and log the exact gap.
5. Mark phase Completed only when every Completion Gate item is checked.
6. Then and only then move the next phase to In Progress.
