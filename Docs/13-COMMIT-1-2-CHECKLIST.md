# Commits 1 → 6.1 — Reviewer Checklist & Run Steps
**Status:** Ready for review — Phase 0 foundations + AllocationModule + status-machine integration + cross-county identity registry **wired into submission** + disbursement FK chain + first frontend screen (county admin ward distribution)
**Reference:** `Docs/12-DATA-INTEGRITY-AND-OFFLINE-DESIGN.md` §4 (geographic hierarchy), §5 (VILLAGE_ADMIN + cross-county lock), §7 (money integrity)

---

## What landed in this slice

### Commit 1 — Schema foundations

**Prisma schema (`apps/api/prisma/schema.prisma`):**
- Extended `UserRole` enum with `VILLAGE_ADMIN` and `FIELD_AGENT`.
- Extended `ApplicationStatus` enum with `WARD_DISTRIBUTION_PENDING`, `VILLAGE_ALLOCATION_PENDING`, `ALLOCATED`.
- Added new enums `SubmissionChannel`, `DistributionMethod`, `AllocationActorTier`.
- Added six new models: `SubCounty`, `VillageUnit`, `VillageAdminAssignment`, `WardBudgetAllocation`, `VillageBudgetAllocation`, `ResidenceAttestation`.
- Added new columns on existing models:
  - `Ward.subCountyId` (FK)
  - `StudentProfile.villageUnitId` (FK)
  - `Application.{clientIdempotencyKey, submissionChannel, villageBudgetAllocationId, wardBudgetAllocationId, allocationActorId, allocationActorTier, allocatedAt}`
  - `DisbursementRecord.{villageBudgetAllocationId, wardBudgetAllocationId}`

**Migration SQL:** `apps/api/prisma/migrations/20260426050000_p2_geo_money_foundations/migration.sql`
- Additive only — no destructive changes to existing data.
- Three nested invariants enforced as table-level CHECK constraints.
- The disbursement → village_budget_allocation FK chain is enforced via a CHECK that allows `PENDING` rows to remain unlinked but requires the link before any non-pending status.

**Seeds (`apps/api/prisma/seeds/foundation.seed.ts`, `seed-types.ts`, `seed.ts`):**
- Three Turkana sub-counties (Central, North, West) + Nakuru Town East.
- Seven Turkana village units across the three wards.
- Three village admin user accounts assigned 1:1 to one village each, leaving other villages admin-less so override-hierarchy tests can exercise the unavailable path.
- Backfilled `villageUnitId` on all eight student profiles.

### Commit 2 — `AllocationModule`

**Module location:** `apps/api/modules/allocation/`
- `allocation.module.ts` — wires controller + 4 services; imports `NotificationModule`.
- `allocation.controller.ts` — six endpoints (Stage 2/3/4 plus reads).
- `services/`
  - `allocation-availability.service.ts` — single source of truth for "is the village admin available?" per §7.4 (vacant, inactive, deadline-missed, explicitly-delegated).
  - `ward-budget-allocation.service.ts` — Stage 2: enforces Invariant 1 under `pg_advisory_xact_lock(program_id)`.
  - `village-budget-allocation.service.ts` — Stage 3: proportional suggestion + Σ(village_pools) == ward_pool enforcement under nested program → ward locks.
  - `student-allocation.service.ts` — Stage 4: 3-level lock chain (program → ward → village), Invariant 3, **override hierarchy** with structured `application_timeline` audit (`event_type='ALLOCATION_OVERRIDE'`).
- `dto/`
  - `create-ward-allocation.dto.ts`
  - `distribute-village-allocations.dto.ts` (with nested `VillagePoolEntryDto`)
  - `allocate-to-student.dto.ts`
  - `allocation-actor.types.ts` (`OverrideReasonCode` enum + `VillageAdminAvailability` type)

**App wiring:** `AllocationModule` registered in `apps/api/app.module.ts`.

**Integration tests:** `apps/api/test/integration/allocation.e2e-spec.ts` + `allocation.helpers.ts` covering:
- Stage 2 happy path + Invariant 1 violation + role-guard rejection.
- Stage 3 Invariant 2 mismatch rejection + happy path.
- Stage 4 happy path (village admin) + Invariant 3 rejection.
- Override blocked when village admin is available (403).
- Override accepted when admin marked inactive (with `ALLOCATION_OVERRIDE` audit row).
- Override rejected when declared `overrideReasonCode` mismatches system-detected reason (400).
- Override rejected when `overrideReasonNote` missing for COUNTY-tier (400).
- System-detected reason recorded in audit even when actor omits the override code.

### Commit 3 — Status-machine integration

Closes the loop opened by Commit 2 — the new states now flow through the application lifecycle without breaking the legacy single-stage flow.

**`apps/api/modules/allocation/services/village-budget-allocation.service.ts`:**
- After a successful Ward → Village distribution, the service finds every application in the ward whose applicant lives in one of the distributed villages (and whose status is in the pre-allocation pipeline) and:
  1. Updates `applications.status` → `VILLAGE_ALLOCATION_PENDING`.
  2. Stamps `villageBudgetAllocationId` and `wardBudgetAllocationId` onto each application so subsequent `StudentAllocationService.allocate` calls don't have to re-resolve the village from the applicant profile.
  3. Inserts an immutable `application_timeline` row with `event_type = 'VILLAGE_ALLOCATION_PENDING'` carrying the village pool size, distribution method, and allocation deadline.
- Returns `applicationsTransitioned` count in the API response for observability.

**`apps/api/modules/review/ward-review.service.ts`:**
- `RECOMMENDED` decisions now branch:
  - **New flow (a `WardBudgetAllocation` row exists for this `(programId, wardId)`)** → transitions to `WARD_DISTRIBUTION_PENDING` and emits `WARD_REVIEW_RECOMMENDED_AWAITING_DISTRIBUTION`.
  - **Legacy flow (no ward allocation)** → preserves the original `COUNTY_REVIEW` transition and `WARD_REVIEW_RECOMMENDED` event for backward compat.
- `REJECTED` and `RETURNED` decisions are unchanged.

**Test coverage** (added to `allocation.e2e-spec.ts`):
- `progresses through the full status machine: WARD_REVIEW → WARD_DISTRIBUTION_PENDING → VILLAGE_ALLOCATION_PENDING → ALLOCATED`.
- `preserves the legacy COUNTY_REVIEW path when no WardBudgetAllocation exists (no regression)`.

### Commit 6 — Cross-county identity registry (§5.3 L2)

Addresses the original Type-C ghost-student vector: one identity claiming applications in multiple counties during the same intake cycle.

**Migration:** `apps/api/prisma/migrations/20260426060000_p2_identity_registry/migration.sql`
- Adds `student_profiles.birth_certificate_number` (BYTEA, encrypted at rest).
- Adds platform-scoped `identity_registry` table (no `county_id` discriminator on the identity, RLS intentionally NOT enabled — this is the row that bypasses tenant isolation to detect cross-county duplicates).
- Stores HMAC-SHA256 hashes only — never plaintext national IDs / birth certs.

**Prisma schema:** `IdentityRegistry` model with FKs to active and first-registered counties; `StudentProfile.birthCertificateNumber` field.

**Module:** `apps/api/modules/identity/`
- `dto/identity-claim.types.ts` — `IdentityKind`, `IdentityClaimRequest`, `IdentityClaimOutcome` (CLAIMED / ALREADY_OWNED / CONFLICT).
- `services/identity-registry.service.ts`
  - `computeIdentityHash(rawIdentity, kind)` — normalises (trim, upper-case, strip non-alphanumeric) and HMACs with `IDENTITY_HASH_SECRET` (hard-fails in production if not set).
  - `claim(req)` — idempotent for re-claims by the same application; returns CONFLICT for cross-county collisions in the same cycle.
  - `release(applicationId)` — frees the slot on WITHDRAWN/REJECTED.
  - `syncStatus(applicationId, status)` — auto-releases when the application leaves the active set.
- `identity.module.ts` exports `IdentityRegistryService`.
- Wired into `app.module.ts`.

**Integration tests:** `apps/api/test/integration/identity-registry.e2e-spec.ts` covering:
- Hash determinism + normalisation ("12 345 678" ≡ "12345678").
- Hash isolation across `IdentityKind` (national_id ≠ NEMIS UPI for the same numeric value).
- Plaintext is **not** stored — only the 32-byte SHA-256 hash.
- Idempotent re-claim by the same application returns `ALREADY_OWNED`.
- Cross-county collision in the same cycle returns `CONFLICT` with the holding county's ID.
- `release()` frees the slot for legitimate re-application elsewhere; `firstRegisteredCountyId` is preserved across the release (audit trail intact).
- `release()` is idempotent and silent on no-op.
- `syncStatus(WITHDRAWN)` auto-releases.

> **Note:** Commit 6 lands the building block. The hookup into `ApplicationSubmissionService.submit` (so that submissions actually call `claim` and reject CONFLICT with a 409) is intentionally deferred to a follow-up commit to keep this slice low-risk relative to the existing P3 submission flow.

---

## Run steps (local dev)

> **Prereqs:** Postgres + Redis containers running per `docker-compose.yml`.

```bash
# from repo root
pnpm install

# 1. Regenerate Prisma client against the new schema
pnpm --filter @smart-bursary/api exec prisma generate

# 2. Apply the new migration to the dev database
pnpm --filter @smart-bursary/api exec prisma migrate deploy

# 3. Re-seed dev fixtures (idempotent upserts; safe to re-run)
pnpm --filter @smart-bursary/api exec prisma db seed

# 4. Run the new allocation + identity-registry integration tests
pnpm --filter @smart-bursary/api exec jest \
  --config jest.config.ts \
  --runInBand \
  test/integration/allocation.e2e-spec.ts \
  test/integration/identity-registry.e2e-spec.ts

# 5. Run the existing test suites (must remain green — Commit 3 includes a
#    legacy-path no-regression assertion in allocation.e2e-spec.ts)
pnpm --filter @smart-bursary/api exec jest --config jest.config.ts --runInBand
```

**Required environment variable** (Commit 6):
```bash
# Production: inject from AWS Secrets Manager / KMS
# Development: defaults to a deterministic dev value if unset
export IDENTITY_HASH_SECRET="<32-byte-random-secret>"
```

Expected pre-`prisma generate` lint state: **TypeScript will report ~50 stale-type errors** in the new files (e.g., "Property 'wardBudgetAllocation' does not exist on type PrismaService"). These are produced by the IDE's TS server using the OLD generated client and **all resolve after step 1**.

---

## Notes for reviewers

1. **Coexistence with the legacy `CountyReviewService`.** The existing single-stage approval path in `apps/api/modules/review/county-review.service.ts` is intentionally untouched. Both paths can coexist while orchestration migrates over (subsequent commit). `bursary_programs.allocated_total` continues to track student-level allocations in the legacy path; ward-pool sums are computed on-demand from `ward_budget_allocations` rather than mutating that column.

2. **Status-machine integration landed in Commit 3.** `WardReviewService` now branches based on whether a `WardBudgetAllocation` exists, and `VillageBudgetAllocationService.distribute` transitions affected applications to `VILLAGE_ALLOCATION_PENDING`. The legacy `COUNTY_REVIEW` path remains intact for programs without ward distribution — verified by the no-regression assertion in `allocation.e2e-spec.ts`.

3. **No RLS policies added in this commit.** The new tables enable row-level security via `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` in the migration but no `CREATE POLICY` statements were added. They follow the existing project pattern of enforcing tenant scope at the service layer (countyId in every query). RLS policies for the new tables will land in a Phase 1 hardening commit alongside RLS policies for the existing tables that lack them.

4. **`IdentityRegistryService` wired into submission in Commit 6.1.** `ApplicationSubmissionService.submitApplication` now calls `claimIdentityForCycle()` between profile-completion check and the actual submit. A `CONFLICT` outcome throws `409 DUPLICATE_IDENTITY_ACROSS_COUNTIES` with `{ conflictingCountyId, conflictingApplicationId, cycle }` in the structured `details` payload. If the underlying submit fails after a successful claim, the slot is auto-released so the student can retry without being self-blocked. Students without `national_id` or `birth_certificate_number` set on their profile fall through with a logged warning — the cross-county lock is then skipped for that submission and the design's L5 (village admin attestation) and L6 (AI similarity) layers remain as the integrity floor.

5. **Disbursement FK chain wired in Commit 3.1.** `DisbursementService.initiateDisbursement` now stamps `villageBudgetAllocationId` and `wardBudgetAllocationId` from `application.*` onto the new `DisbursementRecord` row. `updateTransactionStatus` now propagates the `disbursedTotalKes` increment up to both ancestor allocation rows on `SUCCESS`, inside a SERIALIZABLE transaction, idempotent across retries (only on transition INTO `SUCCESS` from a non-SUCCESS state). It also accepts `ALLOCATED` as a valid pre-disbursement state in addition to the legacy `APPROVED`. The OCOB audit query in §7.6 of the design doc now returns the full chain.

6. **County admin frontend (Commit 5a) — ward distribution screen.** New page at `/county/programs/[id]/allocations` lets county admins push pools to wards with live "remaining program capacity" feedback. It surfaces `ApiClientError` codes (e.g. `409` for ceiling violations) directly in the UI. The ward-committee village-split (5b) and village-admin per-student (5c) screens are next.

7. **What is *not* in this slice:**
   - **5b** — ward-committee village-split frontend (uses Stage 3 endpoints + proportional suggestion).
   - **5c** — village admin per-student allocation frontend with override-banner UX.
   - PWA-offline service worker, IndexedDB outbox.
   - USSD callback handler and menu state machine.
   - Kiosk / paper-intake assisted-application UI.
   - IPRS + NEMIS integrations (external API verification — the new `IdentityRegistry` only handles platform-internal cross-county dedup).
   - All of these are documented Phase 1+ backlog in `Docs/12-DATA-INTEGRITY-AND-OFFLINE-DESIGN.md` §10.

8. **Idempotent seed re-runs.** The seed uses `upsert` everywhere keyed on stable code/email values. Re-running is safe and converges to the desired state.

---

## Suggested next commits (for follow-up sessions)

| # | Commit | Scope | Status |
|---|---|---|---|
| 3 | Status-machine integration | `WardReviewService` branches; `VillageBudgetAllocationService` transitions applications. | ✅ Landed |
| 6 | Identity registry building block | `identity_registry` table + `IdentityRegistryService` + integration tests. | ✅ Landed |
| 6.1 | Submission hookup for `IdentityRegistryService` | `ApplicationSubmissionService.submitApplication` calls `claim()`; CONFLICT → 409 DUPLICATE_IDENTITY_ACROSS_COUNTIES; auto-release on submit failure. | ✅ Landed |
| 3.1 | Disbursement FK-chain hookup | `DisbursementRecord.{village,ward}BudgetAllocationId` populated at create; `disbursedTotalKes` propagated up the chain on SUCCESS. | ✅ Landed |
| 5a | County admin ward-distribution UI | `/county/programs/[id]/allocations` page lists existing ward allocations, accepts new ones, surfaces 409 ceiling violations inline. | ✅ Landed |
| 5b | **Ward-committee village-split UI** | New page (probably `/county/programs/[id]/allocations/[wardAllocId]`) that calls `GET /ward-allocations/:id/proportional-suggestion`, renders an editable per-village table with running Σ totals, posts to the distribute endpoint. | Pending |
| 5c | **Village admin per-student allocation UI** | New page under `(admin)/village/...` (or a new `(village-admin)` route group) that lists `VILLAGE_ALLOCATION_PENDING` applications for the village admin's village, lets them set per-student amounts, surfaces the 409 capacity errors and the override-banner if a non-village actor opens the screen. | Pending |
| 4 | RLS policies for new tables | `CREATE POLICY` on `sub_counties`, `village_units`, `village_admin_assignments`, `ward_budget_allocations`, `village_budget_allocations`, `residence_attestations`, `identity_registry`. Best bundled with project-wide RLS hardening. | Pending |
| 7 | PWA offline | Service worker + IndexedDB outbox + idempotency-key sync. | Pending |
| 8 | USSD discovery channel | Africa's Talking handler + status menu. | Pending |
| 9 | Kiosk + paper intake | Field-agent assisted-application flow + Claude Vision OCR pre-fill. | Pending |
| 10 | IPRS / NEMIS | External identity verification integrations with caching + circuit breaker. | Pending |
