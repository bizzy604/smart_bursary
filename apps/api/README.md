# Smart Bursary API

NestJS modular monolith backend for Smart Bursary.

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL (and Redis if running queue-backed flows)

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
