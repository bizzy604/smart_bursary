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
