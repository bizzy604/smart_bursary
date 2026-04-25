# API Release Readiness Checklist (P7)

Last Updated: 2026-04-18
Owner: GitHub Copilot
Phase: P7 (Hardening and Release Readiness)

## Security Baseline

- [x] Production dependency audit has no known vulnerabilities.
  - Evidence: `cd apps/api ; pnpm audit --prod` (exit 0).
- [x] Source/config secret-hygiene scan has no private key or cloud key signature leaks.
  - Evidence: regex scan across `apps/api/**` found no hardcoded key signatures.
- [x] Security regression e2e checks pass.
  - Evidence: `test/integration/b08-security-audit.e2e-spec.ts`.

## Reliability Baseline

- [x] Notification lifecycle regression checks pass.
  - Evidence: `test/integration/notification-status-change.e2e-spec.ts`.
- [x] Disbursement execution retry/failure regression checks pass.
  - Evidence: `test/integration/disbursement-execution.e2e-spec.ts`.
- [x] AI scoring failure lifecycle regression checks pass.
  - Evidence: `test/integration/review-ai-failure.e2e-spec.ts`.

## Observability Baseline

- [x] Request correlation header (`X-Request-Id`) is generated and propagated.
  - Evidence: `test/integration/application.e2e-spec.ts`.
- [x] Request duration/status logging interceptor is globally wired.
  - Evidence: `apps/api/common/interceptors/request-observability.interceptor.ts` in `APP_INTERCEPTOR` chain.

## Performance Baseline

- [x] Build-time hardening gate passes.
  - Evidence: `pnpm --filter @smart-bursary/api run build`.
- [x] Load smoke baseline passes with p95 under budget.
  - Evidence: `pnpm --filter @smart-bursary/api run perf:smoke`.
  - Latest metrics: `totalRequests=240`, `concurrency=24`, `p95Ms=99.56`, `rps=335.7`.
- [x] Soak-style run baseline passes with p95 under budget.
  - Evidence: `P7_LOAD_TOTAL_REQUESTS=1200 P7_LOAD_CONCURRENCY=20 pnpm --filter @smart-bursary/api run perf:smoke`.
  - Latest metrics: `totalRequests=1200`, `concurrency=20`, `p95Ms=168.37`, `rps=291.9`.
- [x] Performance budget is documented.
  - Evidence: `P7_HEALTH_P95_BUDGET_MS` in `apps/api/README.md`.

## Configuration and Caching Baseline

- [x] Config cache is enabled for startup configuration reads.
  - Evidence: `ConfigModule.forRoot({ cache: true })` in `apps/api/app.module.ts`.
- [x] Route-level response caching baseline is explicitly documented as currently not enabled.
  - Evidence: no `CacheInterceptor`/`CacheTTL` usage in `apps/api/**` during P7 baseline scan.

## Final Exit Gate (Pending)

- [x] Run the full API regression test suite in one gate execution.
  - Evidence: `pnpm --filter @smart-bursary/api run test -- --runInBand` passed (24 suites, 97 tests).
- [x] Confirm P7 tracker completion gate checkboxes and mark phase `Completed`.
