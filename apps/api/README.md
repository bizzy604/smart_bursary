# Smart Bursary API

NestJS modular monolith backend for Smart Bursary.

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL (and Redis if running queue-backed flows)

## Required Storage Configuration

Document uploads are S3-only. Configure these environment variables before starting the API:

- `S3_BUCKET`
- `S3_REGION`

Optional for custom endpoints or static credentials:

- `S3_ENDPOINT`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_FORCE_PATH_STYLE`
- `S3_SIGNED_URL_TTL_SECONDS`

## Install Dependencies

From repo root:

```bash
pnpm install
```

## Start API (Development)

From repo root:

```bash
pnpm --filter @smart-bursary/api run dev
```

From app folder:

```bash
cd apps/api
pnpm dev
```

API default URL: `http://localhost:3001` (or your configured `PORT`).

## Start API (Production Build)

From repo root:

```bash
pnpm --filter @smart-bursary/api run build
pnpm --filter @smart-bursary/api run start
```

## Useful Commands

```bash
pnpm --filter @smart-bursary/api run typecheck
pnpm --filter @smart-bursary/api run test
pnpm --filter @smart-bursary/api run prisma:migrate --name <migration_name>
pnpm --filter @smart-bursary/api run prisma:seed
docker compose up -d postgres redis
```

## Program Lifecycle Endpoints

County admin and platform operator roles can now manage bursary program lifecycle via:

- `POST /api/v1/programs`
- `PATCH /api/v1/programs/:id`
- `POST /api/v1/programs/:id/publish`
- `POST /api/v1/programs/:id/close`

Student-facing discovery endpoints remain available:

- `GET /api/v1/programs/active`
- `GET /api/v1/programs/:id`

Student `GET /api/v1/programs` and `GET /api/v1/programs/active` responses now include:

- `eligible`
- `ineligibilityReason`
- `ineligibility_reason`

## Student Profile Endpoints

Authenticated students can manage profile completion via:

- `GET /api/v1/profile`
- `PATCH /api/v1/profile/personal`
- `PATCH /api/v1/profile/academic`
- `PATCH /api/v1/profile/family`
- `GET /api/v1/profile/completion`

Application submission now requires:

- Verified email
- Verified phone
- Completed profile sections (personal, academic, family)

Application semantic validation responses include `422` domain codes for:

- `INELIGIBLE`
- `PROGRAM_CLOSED`
- `PROFILE_INCOMPLETE`

## Application Form Data Fidelity

Application section updates now enforce strict section contracts using these keys:

- `section-a` (personal and academic)
- `section-b` (amounts, HELB status, prior bursary disclosure)
- `section-c` (family status and sibling burden)
- `section-d` (household income and hardship narrative)
- `section-e` (other disclosures and declarations)
- `section-f` (supporting attachment metadata)

Duplicate draft creation for the same student and program is rejected with `409 Conflict` and code:

- `DUPLICATE_APPLICATION`

## AI Scoring Orchestration

Submission now triggers asynchronous AI scoring via the `ai-scoring` queue.

- Student submit endpoint enqueues `score-application` jobs.
- Queue worker invokes the AI scoring service `/score` endpoint.
- AI service fetches application data from internal API and ingests score cards back into NestJS.

Internal AI service endpoints (service-key protected):

- `GET /api/v1/internal/applications/:id`
- `POST /api/v1/internal/ai-scores`

Timeline lifecycle events now include:

- `AI_SCORING_QUEUED`
- `AI_SCORED` or `AI_SCORE_UPDATED`
- `AI_SCORING_FAILED`
- `AI_SCORING_QUEUE_FAILED`

County AI weight controls:

- `GET /api/v1/admin/scoring-weights`
- `PATCH /api/v1/admin/scoring-weights`

## County Tenant Settings

County admins can manage tenant-specific configuration via:

- `GET /api/v1/admin/settings`
- `PATCH /api/v1/admin/settings`

Settings payloads now include:

- Branding profile: county name, fund name, legal reference, primary color, logo metadata.
- Form customization: color scheme, logo placement, and approved section order.
- Current AI scoring weights snapshot for county admin UX hydration.

Plan-tier gate behavior:

- `GET/PATCH /api/v1/admin/settings` requires county plan tier `STANDARD` or `ENTERPRISE`.
- `GET/PATCH /api/v1/admin/scoring-weights` requires county plan tier `ENTERPRISE`.

## Tenant Provisioning (Platform Operator)

Platform operators can bootstrap and manage county tenants via:

- `GET /api/v1/platform/tenants/status`
- `GET /api/v1/platform/tenants`
- `GET /api/v1/platform/tenants/:id`
- `POST /api/v1/platform/tenants`
- `PATCH /api/v1/platform/tenants/:id/plan-tier`

Provisioning flow currently creates:

- County record with initial plan tier
- Default ward seed dataset when explicit ward list is not provided
- Initial county-admin account for tenant bootstrap

## Disbursement Execution and Receipts

Finance and student disbursement APIs now include:

- `POST /api/v1/disbursements` (returns `202 Accepted` for async execution)
- `POST /api/v1/disbursements/:disbursementId/retry`
- `POST /api/v1/disbursements/batch/eft`
- `GET /api/v1/disbursements/:disbursementId/receipt`
- `GET /api/v1/disbursements/application/:applicationId/receipt`

Execution behavior:

- M-Pesa B2C disbursements execute asynchronously via queue worker or in-process fallback.
- Failed attempts retry up to 3 times with backoff before terminal manual intervention timeline events.
- Successful disbursements persist provider transaction IDs and transition applications to `DISBURSED`.

M-Pesa adapter environment variables:

- `MPESA_B2C_MODE` (`mock` or provider mode)
- `MPESA_B2C_URL`
- `MPESA_B2C_BEARER_TOKEN` (optional)
- `MPESA_B2C_TIMEOUT_MS` (optional)
- `DISBURSEMENT_RETRY_BASE_DELAY_MS` (optional)
