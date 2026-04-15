# Smart Bursary API (Modular Monolith)

This package hosts the NestJS backend modular monolith for Smart Bursary.

## Structure

- app bootstrap: main.ts and app.module.ts
- configuration: config/
- shared infrastructure: database/, common/
- feature modules: modules/
- queue/redis adapters: queue/, redis/
- tests: test/unit, test/integration

## Commands

- build: pnpm --filter @smart-bursary/api run build
- dev: pnpm --filter @smart-bursary/api run dev
- typecheck: pnpm --filter @smart-bursary/api run typecheck
- test (targeted): pnpm --filter @smart-bursary/api exec jest test/integration/application.e2e-spec.ts --config jest.config.ts
- migrate: pnpm --filter @smart-bursary/api run prisma:migrate --name <migration_name>
- seed: pnpm --filter @smart-bursary/api run prisma:seed
- db container: docker compose up -d postgres
- queue container: docker compose up -d redis

## Infrastructure Notes

- Document virus-scan jobs use Redis-backed queue infrastructure when `REDIS_URL` is available.
- Local development can use the `redis` service from the root `docker-compose.yml`.
- If Redis is unavailable in tests, the queue adapter falls back to a lightweight in-process async path.

## Guardrails

- Work phase-by-phase using IMPLEMENTATION_TRACKER.md
- Keep controller logic thin and delegate to collaborators
- Keep each source file under 200 lines
- Add required header comments to each new or modified source file
