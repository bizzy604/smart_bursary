# Testing the smart_bursary monorepo locally

This skill captures everything needed to spin up the smart_bursary stack and exercise it through the UI for end-to-end visual / feature testing.

## Stack overview

- **Monorepo** managed by pnpm workspaces. Root `package.json` exposes `"dev": "pnpm -r --parallel dev"`.
- `apps/api` — NestJS, listens on `:3001`, base path `/api/v1`.
- `apps/web` — Next.js 16 (Turbopack), listens on `:3000`. Uses NextAuth (Auth.js v5) with a Credentials provider that calls the Nest `/auth/login` endpoint.
- Postgres + Redis via `docker-compose.yml` (services: `smart-bursary-postgres`, `smart-bursary-redis`).

## Environment files

- `apps/api/.env` is checked into the dev workflow with `DATABASE_URL=postgresql://smart_bursary:smart_bursary@localhost:5432/smart_bursary_dev`, `REDIS_URL=redis://localhost:6379`, `JWT_SECRET=test-jwt-secret-must-be-32-characters-long`, `PORT=3001`.
- `apps/web/.env.local` is **not** committed. Create it before booting web:
  ```
  AUTH_SECRET=$(openssl rand -base64 32)
  NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
  ```
  In production / Vercel you also need `AUTH_TRUST_HOST=true`. Vercel deploys currently fail until `AUTH_SECRET` / `NEXT_PUBLIC_API_URL` / `AUTH_TRUST_HOST` are set in the Vercel project — that's the well-known env-var blocker, not a code issue.

## Boot sequence

```bash
docker compose up -d                    # postgres + redis
cd apps/api && pnpm prisma migrate deploy
cd apps/api && pnpm prisma db seed
cd apps/api && pnpm dev                 # background
cd apps/web && pnpm dev                 # background — first /dashboard compile is ~25s under Turbopack
```

First load of `/login` and `/dashboard` is slow (compiling). When automating, after clicking Sign in **wait at least 8–12 seconds** before screenshotting; checking `/tmp/web.log` for `POST /api/auth/callback/credentials? 200` confirms the credentials handshake succeeded.

## Login

- Login form has three required fields: **email**, **password**, **county slug**. The county slug is a placeholder, not a default value — you must type it.
- Seed county slug: `turkana`.
- Dev password (constant for all seeded users): exported as `DEV_PASSWORD` from `apps/api/prisma/seeds/seed-types.ts`. Read that file (or `grep DEV_PASSWORD apps/api/prisma/seeds/seed-types.ts`) for the literal value — it lives only in the local seed fixture and is never used against any real environment.

### Seeded role accounts

| Role | Email | Lands on |
|---|---|---|
| STUDENT | `aisha.student@turkana.go.ke` | `/dashboard` |
| WARD_ADMIN | `ward.admin@turkana.go.ke` | `/ward/dashboard` |
| FINANCE_OFFICER | `finance.officer@turkana.go.ke` | `/county/...` |
| COUNTY_ADMIN | `county.admin@turkana.go.ke` | `/county/dashboard` |
| PLATFORM_OPERATOR | `platform.operator@smartbursary.dev` | `/tenants` |

Aisha has 1 SUBMITTED + 1 DRAFT application — useful for Table-polish tests. Other students (`brian` … `hana`) are seeded too but generally have no apps; use them for empty-state demos.

## Sanity-check via API

```bash
curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"aisha.student@turkana.go.ke\",\"password\":\"$(grep DEV_PASSWORD apps/api/prisma/seeds/seed-types.ts | sed -E \"s/.*'(.+)'.*/\\1/\")\",\"countySlug\":\"turkana\"}"
```

Returns `{ accessToken, refreshToken, user }`.

## Sign out

Sidebar bottom → click the avatar/name footer → dropdown shows **Profile** + **Sign out**. Sign out hits `signOut({ callbackUrl: "/login" })` and clears the session — verify by reloading any protected route after signing out.

## UI surfaces to test for visual / polish work

The app uses two reusable design components introduced in PR #3:
- `components/shared/page-header.tsx` — `PageHeader` with `tone="plain"` (hairline border + eyebrow + h1 + optional icon chip) or `tone="branded"` (deep brand gradient panel with subtle dot pattern).
- `components/shared/stats-card.tsx` — `StatsCard` with optional `icon`, `intent` (`neutral`/`brand`/`success`/`warning`/`danger`), and `trend` props.

Refactored pages (use these for visual regression):
- `(student)` `/dashboard` — branded PageHeader, 3 StatsCards.
- `(student)` `/programs`, `/applications` — plain PageHeader + polished Table.
- `(admin)` `/ward/dashboard` — plain PageHeader + 4 intent-colored StatsCards (Pending=warning, Reviewed=success, Rejected=danger, Recommended=brand).
- `(admin)` `/county/dashboard` — plain PageHeader + 4 StatsCards.
- `(ops)` `/tenants`, `/health` — plain PageHeader + 3 StatsCards. On `/health` make sure the "Last refresh …" snapshot text sits flush under the description (parent `<main>` has `space-y-5`; the snapshot must be wrapped in a div with `mt-2` to bypass that rule).

## Devin Secrets Needed

None — local dev runs fully on the seeded fixtures and a self-generated `AUTH_SECRET`. For Vercel deploys the user owns setting `AUTH_SECRET`, `NEXT_PUBLIC_API_URL`, and `AUTH_TRUST_HOST` in the Vercel project envs.

## Pitfalls / things to remember

- **County slug is required** at login — leaving it blank yields a silent validation tooltip; `signIn` won't fire.
- **First Turbopack compile is slow** (`/dashboard` cold compile ~25s). Don't conclude that login failed without checking `/tmp/web.log` for the `200` on `/api/auth/callback/credentials`.
- **`pnpm prisma db seed` is idempotent** but uses fixed timestamps — re-running it overwrites mutations made during testing. Re-run before each clean test pass.
- **Middleware excludes `/api/*`** so route handlers (e.g. PDF endpoints) enforce their own `auth()` check. Don't add a middleware-only auth assumption.
- **Vercel deploy failures are an env-var problem, not a code problem.** Don't try to fix them from the code side.
