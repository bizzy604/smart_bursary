# KauntyBursary — Data Integrity, Identity Verification & Offline Channels Design
**Version:** 0.1 (Brainstorm / RFC for review)
**Status:** Draft — recommendations + trade-offs for engineering decision
**References:** `01-PRD.md`, `02-SYSTEM_DESIGN.md`, `03-DATABASE-ARCHICTECTURE.md`, `04-API-DESIGN.md`
**Scope decisions locked with product:**
- Identity policy: **Active-cycle one-county lock** (one application platform-wide per intake cycle; cycle re-evaluated each year).
- Offline reach: **Full set of four channels** (PWA offline + USSD + Ward-office kiosk + Paper-to-digital intake).

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Decomposition](#2-problem-decomposition)
3. [Current State Audit](#3-current-state-audit)
4. [Geographic Hierarchy: Sub-County → Ward → Village Unit](#4-geographic-hierarchy-sub-county--ward--village-unit)
5. [Student Identity & Ghost-Student Prevention](#5-student-identity--ghost-student-prevention)
6. [Location Verification: Where Does the Student Actually Live?](#6-location-verification-where-does-the-student-actually-live)
7. [Money Integrity: Ward → Village → Student Allocation Flow](#7-money-integrity-ward--village--student-allocation-flow)
8. [Offline & Low-Tech Channels](#8-offline--low-tech-channels)
9. [Defense-in-Depth Summary](#9-defense-in-depth-summary)
10. [Implementation Phasing](#10-implementation-phasing)
11. [Schema & Module Deltas](#11-schema--module-deltas)
12. [Open Questions & Risks](#12-open-questions--risks)
13. [Cost & Latency Estimates](#13-cost--latency-estimates)

---

## 1. Executive Summary

This document addresses three non-functional concerns that the current PRD recognises but does not yet design end-to-end:

1. **Data integrity per student**: ensuring one verified human → at most one active application per intake cycle, across all 47 counties.
2. **Location truth**: validating that the declared `county → sub-county → ward → village unit` actually corresponds to where the student lives.
3. **Reach to the bottom 30% of users** — students without smartphones, in low-bandwidth wards, or with low digital literacy — without sacrificing data integrity.

The recommended design is **defense-in-depth**: no single check is asked to carry the whole load. Each layer is cheap, fails open to the next, and produces an evidence trail in `application_timeline`. The offline strategy is a **multi-channel funnel** that converges on the same canonical `Application` record regardless of how the data arrived.

The ghost-student threat is treated as a **financial fraud** problem (KES disbursed to a person who isn't entitled), not a UX problem. Every preventive control is justified against an expected fraud-loss reduction; every UX friction is justified against a measured drop in legitimate completion rate.

---

## 2. Problem Decomposition

The three concerns are deliberately separated because they have different threat models, different success metrics, and different cost curves.

| Concern | Threat actor | What "winning" looks like | Cost driver |
|---|---|---|---|
| **Identity integrity** | Student double-applying across counties; impersonator using someone else's national ID; entirely fabricated student | < 0.1% of disbursed funds go to non-existent or duplicate identities | Per-verification API cost (IPRS, NEMIS), engineering for cross-tenant lookups |
| **Location truth** | Student declaring a wealthier ward to game eligibility; non-resident applying to a county's bursary; ward boundary disputes | Declared `(county, sub-county, ward, village)` is corroborated by ≥ 2 independent signals | Field officer time, polygon data acquisition, document review |
| **Offline reach** | None (this is a UX/equity problem, not adversarial) | Application submission rate among non-smartphone users matches the smartphone cohort within ±10 pp | Engineering for 4 channels; field-agent training; paper logistics |

These three problems **interact**: solving offline reach via field agents *also* strengthens location truth (geo-tagged kiosk submission), and hardening identity *also* prevents one form of fraud that offline channels are otherwise vulnerable to. The design exploits these interactions rather than solving each in isolation.

---

## 3. Current State Audit

### 3.1 What the architecture already does well

- **County-scoped tenancy with RLS** — strong horizontal isolation between counties (`02-SYSTEM_DESIGN.md` §4).
- **Same-county duplicate prevention** — `UNIQUE(applicant_id, program_id) WHERE status != 'WITHDRAWN'` (`03-DATABASE-ARCHICTECTURE.md` §5.4).
- **National ID uniqueness within a county** — `idx_profile_national_id_county` (`03-DATABASE-ARCHICTECTURE.md` §5.2).
- **Phone OTP + email verification** required before submission (`01-PRD.md` AU-01/AU-02).
- **AI anomaly detection** flags duplicate national IDs within county and implausible income vs. occupation (`02-SYSTEM_DESIGN.md` §5.2).
- **PDF QR code** carries the application reference for manual verification.
- **Immutable audit log** on every state change (`application_timeline` trigger).

### 3.2 Specific gaps relative to your concerns

| # | Gap | Evidence |
|---|---|---|
| G1 | No **cross-county** deduplication. Same `national_id` can register in Turkana and Nairobi. | `idx_profile_national_id_county` is per-county; no platform-level identity table. |
| G2 | **Geographic hierarchy is flat.** Only `Ward` is a normalized table; `sub_county` is a free-text column on `wards`; `village_unit` is a free-text column on `student_profiles`. | `03-DATABASE-ARCHICTECTURE.md` §5.1, §5.2 |
| G3 | **No external identity verification.** NEMIS is "optional" in PRD §9; IPRS is not in the spec at all. | `01-PRD.md` §9 |
| G4 | **Location is self-declared** — no GPS stamp, no polygon validation, no chief attestation, no proof-of-residence document type. | `student_profiles.home_ward` and `village_unit` are unvalidated VARCHAR. |
| G5 | **Minors don't have a national ID.** Schema only models `national_id`; secondary-school students typically only have a **birth certificate number**. | `student_profiles.national_id` is the only identity field. |
| G6 | **No design for non-smartphone users.** Native mobile apps and USSD are explicitly v1 non-goals. PRD §11 acknowledges the risk and offers "field agent mode" as a TBD mitigation. | `01-PRD.md` §3.2, §11 |
| G7 | **No idempotency story for offline sync.** Submission is online-only; no client-generated UUID, no offline-draft table, no replay-safe ingest path. | Application creation in `application-submission.service.ts` is a server-side INSERT chain. |

The rest of the document proposes filling each gap with concrete, trade-off-justified design.

---

## 4. Geographic Hierarchy: Sub-County → Ward → Village Unit

### 4.1 Recommendation: Normalize the full 4-level hierarchy

Replace the current flat structure with a fully normalized chain:

```
County (existing)
  └── SubCounty (NEW)
        └── Ward (existing — modified)
              └── VillageUnit (NEW)
```

Every administrative entity is a first-class table with a UUID PK, an FK to its parent, an optional `geometry` polygon (PostGIS), and a `code` aligned with the official Independent Electoral and Boundaries Commission (IEBC) / Kenya National Bureau of Statistics (KNBS) registry where one exists.

### 4.2 Why this matters beyond schema cleanliness

| Capability unlocked | Why the flat schema can't do it |
|---|---|
| Sub-county-level eligibility rules ("urban informal settlements only") | Aggregating by free-text `sub_county` produces typo variance; "Lodwar Town" ≠ "Lodwar town". |
| Ward-polygon GPS validation | No geometry on a free-text column. |
| Village-elder / village-admin assignment | Can't FK an attestation or allocation to a string. |
| Reporting accuracy by sub-county | `GROUP BY` on a string is fragile and slow. |
| Geographic eligibility audit ("are all 5 wards in Sub-County X getting fair allocation?") | Requires a sub-county FK on `bursary_programs` or `application`. |

### 4.3 Trade-offs

| Decision | Pros | Cons | Verdict |
|---|---|---|---|
| **Normalize fully (recommended)** | Referential integrity; polygon support; clean reporting; village-elder attestation possible | Migration of free-text data; need authoritative seed registry | **Adopt** |
| Keep flat (current) | Zero migration cost | All capabilities in §4.2 blocked; future partition by sub-county harder | Reject |
| Normalize sub-county only, leave village as free-text | Lower migration cost | Village-level attestation still impossible; doesn't close the ghost-student vector at the most local level | Reject — village_unit is where the chief operates, the most evidence-rich layer |

### 4.4 Source of truth for the seed data

- **County / Sub-county / Ward**: KNBS publishes the official 47/350/1,450 breakdown; IEBC has the canonical ward boundary shapefiles (used for elections). License is open (Government of Kenya open data).
- **Village Unit**: No single national registry exists. Two-step approach:
  1. **Bootstrap from county records** — each county's Department of Devolution maintains a list of "village units" (sometimes called *mtaa*, *kijiji*, or *village*) for the chief's office. Ingest at tenant provisioning.
  2. **Curate via village-admin role** — village admins can propose new village units (subject to county admin approval). Treats the registry as living, not static.

### 4.5 Migration strategy (zero-downtime)

1. Create new tables `sub_counties`, `village_units` alongside existing schema.
2. Write a migration script that, for each county, parses the free-text `wards.sub_county` and `student_profiles.village_unit` and writes normalized rows. Unresolved values go into a `migration_unresolved` audit table for manual review.
3. Add nullable FK columns `wards.sub_county_id`, `student_profiles.village_unit_id`. Backfill.
4. **Dual-write window** (one intake cycle): writers populate both old and new columns; readers prefer the new.
5. Drop the free-text columns. Make FK NOT NULL.

This is the standard expand-contract migration; no application downtime.

---

## 5. Student Identity & Ghost-Student Prevention

### 5.1 Threat model

A ghost student is one of:

- **Type A — Phantom**: A completely fabricated identity. No real person exists.
- **Type B — Impersonator**: A real person's national ID used by someone else.
- **Type C — Multi-lister**: One real student applying simultaneously in multiple counties (or multiple wards/programs within the same cycle) to multiply their odds.
- **Type D — Insider-collusion**: A ward admin or village admin approves a student who is real but ineligible (lives elsewhere, parent-income misstated). Out of scope for *identity* — handled by `ApplicationReview` audit + AI integrity checks + the override hierarchy in §7.4.

The defense-in-depth pyramid below explicitly maps each layer to which threat type it stops.

### 5.2 The 6-layer defense pyramid

```
       ┌────────────────────────────────────┐
       │ L6  AI cross-application similarity│  ← defends Type A, C
       │     detection (post-submit)        │
       ├────────────────────────────────────┤
       │ L5  Village Admin (attest + allocate)│  ← defends Type B, C, D
       │     residence + final amount       │
       ├────────────────────────────────────┤
       │ L4  NEMIS school enrollment check  │  ← defends Type A
       │     (UPI ↔ institution match)      │
       ├────────────────────────────────────┤
       │ L3  IPRS identity verification     │  ← defends Type A, B
       │     (name + DOB + photo match)     │
       ├────────────────────────────────────┤
       │ L2  Cross-county active-cycle lock │  ← defends Type C
       │     (platform-wide HMAC index)     │
       ├────────────────────────────────────┤
       │ L1  Phone OTP (KYC-bound SIM)      │  ← weak defense, baseline
       │     + email verification           │
       └────────────────────────────────────┘
```

### 5.3 Layer-by-layer design

#### L1 — Phone OTP (existing, keep)

Kenyan SIM cards are KYC-registered to a national ID by Communications Authority regulations (2018). A verified phone is a moderate identity proxy because Safaricom's KYC links the SIM to a real person. Already implemented.

**Strength:** Deters trivial automation. **Weakness:** Multi-SIM ownership is common (~1.4 SIMs per adult in Kenya); a fraudster can buy or borrow another SIM.

#### L2 — Cross-county active-cycle lock (NEW — locked in by user decision)

A platform-scoped table `identity_registry` (no `county_id`, RLS disabled) maintains, for each unique identity, the currently active application across the whole platform.

**Identity key (in priority order):**

1. `national_id` (8-digit, adults)
2. `birth_certificate_number` (minors)
3. `nemis_upi` (universal Kenyan student identifier — fallback when neither of the above is provided)

The chosen key is HMAC-SHA256 hashed with a platform secret (stored in AWS KMS) before being indexed. Raw identity values are never stored in this table — only the hash. This preserves the same encryption posture as the per-county `student_profiles.national_id`.

**Enforcement point**: at `POST /applications/:id/submit`. Pseudocode:

```
on_submit(app):
  hash = HMAC(platform_key, normalized_identity(app))
  existing = identity_registry.find(hash, cycle=app.program.academic_year)
  if existing and existing.application_id != app.id and existing.status in ACTIVE_STATUSES:
    raise ConflictException("DUPLICATE_IDENTITY_ACROSS_COUNTIES",
                            details={existing_county: existing.county_slug})
  identity_registry.upsert(hash, app.id, app.county_id, app.program.academic_year)
  proceed_with_submit(app)
```

**Active statuses** = `{SUBMITTED, WARD_REVIEW, COUNTY_REVIEW, APPROVED, WAITLISTED, DISBURSED}`. `WITHDRAWN` and `REJECTED` exit the lock — a student rejected in County A in March can legitimately apply in County B in April if they've moved.

**Cycle definition**: `academic_year` of the program (e.g., `"2024/2025"`). Counties' intake calendars overlap but the cycle key is deterministic.

**Trade-off table for L2:**

| Approach | Pros | Cons | Verdict |
|---|---|---|---|
| **Platform-scoped HMAC index (recommended)** | Privacy-preserving (no plaintext); O(1) lookup; bypasses RLS cleanly | Single platform secret to protect; HMAC means we can't "search by national ID prefix" for ops debugging | **Adopt** |
| Plaintext `national_id` in platform table | Simpler queries; ops can debug | Weakens the per-county pgcrypto encryption story; adds attack surface | Reject — violates Kenya DPA principle of data minimization |
| Internal API that scans all county partitions | No new table | O(N counties) per submit; inconsistent under transaction | Reject — doesn't scale to 47 counties |
| Don't enforce, rely on AI flagging only | Zero ingest cost | Detection ≠ prevention; money already moves before flag is raised | Reject — fraud loss already incurred |

#### L3 — IPRS identity verification (NEW — opt-in per county)

The **Integrated Population Registration System (IPRS)** is the Government of Kenya's authoritative ID database, accessible via an accredited API to public-sector entities. Counties can be accredited as IPRS-consuming entities; this is now standard for digital procurement systems.

**What IPRS validates:**

- Given a `national_id`, returns name, date of birth, gender, and (for newer records) a thumbnail photo.
- For minors, the **Birth Registration** endpoint validates a `birth_certificate_number` and returns the registered name + parent names.

**When to call**: at submission only (not on every section save), and the result is cached in `student_profiles.iprs_verified_at` for the cycle. No re-call until next cycle.

**Cost**: government fee per call (currently ~KES 5–15 per verification; varies by accreditation). At 100K applications/year, this is KES 1.5M — significant but small relative to total disbursement. Mitigate by caching one-year results and only re-verifying if the student modifies their `national_id`.

**Failure modes:**

- IPRS API down → degrade gracefully to `IPRS_UNVERIFIED`. The ward committee sees the flag and can decide whether to proceed (e.g., after a chief's letter is on file).
- IPRS returns "no record" → **hard block**. The student must contact the registrar's office. This deters Type A (phantom) attacks decisively.
- IPRS name mismatch (Levenshtein > threshold) → soft warning surfaced to ward admin.

#### L4 — NEMIS verification (NEW — required where institution-type is SECONDARY/COLLEGE/UNIVERSITY)

**NEMIS (National Education Management Information System)** assigns every Kenyan student a **UPI (Unique Personal Identifier)** at enrollment. Cross-checking the student's declared institution against their UPI gives a strong signal that the student is a real, actively enrolled learner.

**When to call**: at submission. Cache result for the cycle.

**What it validates**:

- Student is currently enrolled at the declared institution.
- The institution exists in the NEMIS registry (catches "Hogwarts School" jokes).
- Year of study is within plausible range.

NEMIS uptime is historically inconsistent (`01-PRD.md` §11). Treat the result as **soft evidence**: a successful match is a positive signal; a failure to verify does not block submission but raises the AI integrity flag.

#### L5 — Village Admin: dual role (attestation + final allocation authority) — NEW, strongest local signal

This is the **highest-leverage** new feature in this design.

A **Village Admin** is a county-appointed bursary committee member at the smallest administrative unit — the village. Counties already operate village-level bursary committees because subsidiarity (decisions made closest to the affected population) is both a constitutional principle and a practical necessity: village admins know their people. The system formalizes the existing committee structure rather than inventing a new one.

The Village Admin holds **two related but distinct responsibilities**:

1. **Residence attestation** — confirming the student lives in the village they declared (this section).
2. **Final allocation authority** — deciding the KES amount each student receives from the village's bursary pool (detailed in §7).

Combining both in the same role is intentional. It gives the village admin clear ownership of their village's outcomes — a stronger accountability loop than splitting attestation and allocation across separate authorities.

**Design (attestation aspect):**

- Add a `VILLAGE_ADMIN` user role.
- Each `village_unit` has one or more village admins assigned at tenant provisioning (handled by County Admin).
- New table `residence_attestations`: a village admin logs in, sees a queue of pending residence claims for their village, and either **attests** (with optional witness phone) or **disputes**.
- An attestation is valid for one cycle (default 1 year, configurable). The student does not need to re-request mid-cycle.
- Attestation creates an immutable timeline event and produces a digitally-signed PDF artifact stored in S3 (analogous to the chief's paper letter still used in some counties).

**Why this beats GPS or document upload alone:**

- A GPS pin can be spoofed; a village admin cannot easily attest to someone they don't know.
- A photographed letter can be forged or recycled across applications; a digital attestation in the system is auditable per `attester_id`.
- It re-creates the existing trust mechanism (committee = community gatekeeper) inside the digital system, which is politically essential for adoption.

**Failure modes:**

- Village admin unreachable / vacancy / inactive → override hierarchy (Ward Admin → County Admin → Finance Officer) per §7.4, every override audited in `application_timeline`.
- Village admin is the bottleneck → batch attestation UI (show 50 students, attest all with a single signature; each student still gets a signed entry).
- Village admin colludes with applicant → spot-check audit by ward admin; AI similarity layer (L6) flags suspicious clusters; M-Pesa disbursement only to phone registered at student account creation.

#### L6 — AI cross-application similarity detection (extend existing)

The PRD already does within-county duplicate flagging (`02-SYSTEM_DESIGN.md` §5.2). Extend the AI scoring service to query the platform-level `identity_registry` and flag near-duplicates that the deterministic L2 lock didn't catch:

- Same household phone number used across 4+ applications.
- Same bank account number used across 2+ students (parent's account is legitimate; same beneficiary account is suspect).
- Same school + same admission_number in two different applications.
- Photo similarity on uploaded school IDs (Claude Vision embedding distance).

These are **soft flags surfaced to the ward admin**, never auto-rejections.

### 5.4 Identity layer — combined trade-off summary

| Layer | Cost per app | Latency added | Type A | Type B | Type C | Type D | Friction risk |
|---|---|---|---|---|---|---|---|
| L1 Phone OTP | KES 1 (SMS) | 30s user time | Low | Low | None | None | Low |
| L2 Cross-county lock | ~0 | <50ms | None | None | **Strong** | None | None |
| L3 IPRS | KES 5–15 | 200–800ms | **Strong** | **Strong** | None | None | Low (transparent) |
| L4 NEMIS | ~0 (govt) | 200ms (often degraded) | Moderate | None | None | None | Low |
| L5 Village admin attestation | KES 0 (county-salaried) | Hours–days (async) | **Strong** | **Strong** | Moderate | Moderate | Medium (delays first cycle) |
| L6 AI cross-app | KES 5–10 (Claude tokens) | Async (post-submit) | Moderate | Moderate | Moderate | Low | None (background) |

**Recommendation:** Adopt all six. L1, L2, L6 are essentially free; L3 and L4 are gate-once-per-cycle so the cost amortizes; L5 is the integrity anchor and matches the existing political process counties already use.

---

## 6. Location Verification: Where Does the Student Actually Live?

The bursary fund is a **place-based** entitlement. Counties are funding their own residents; mis-attribution (a non-resident gaming the system) is a real failure mode.

### 6.1 Five-signal triangulation

No single signal is trustworthy. We combine five and let the AI score reflect the agreement / disagreement:

| Signal | Strength | Source | Spoofable? |
|---|---|---|---|
| S1 Self-declared `(sub_county, ward, village_unit)` | Weak | Form input | Trivially |
| S2 GPS at submission (browser geolocation API or kiosk) | Weak–Moderate | Client device | Spoofable but raises bar |
| S3 Ward polygon validation | Moderate (confirms S2) | PostGIS query against ward `geometry` | Combined with S2 |
| S4 Proof-of-residence document (chief's letter, utility bill) | Moderate | Section F upload | Forgery possible; AI doc-quality scan helps |
| S5 Village admin digital attestation (L5 above) | **Strong** | `residence_attestations` table | Requires insider collusion |

The `AIScoreCard.integrity_score` (already in schema) is reused to encode location agreement: full agreement = +5; partial = 0; conflict = -10 with an anomaly flag.

### 6.2 GPS at submission — design notes

- **Browser path**: request `navigator.geolocation.getCurrentPosition()` at the final submit step. Optional consent screen first (Kenya DPA requires explicit consent for location data). User can decline; we fall back to 0 location-signal weight, not a hard block.
- **Kiosk path**: the tablet's GPS provides a high-accuracy location stamped on the application. Because the tablet is physically at the ward office, this trivially passes ward polygon validation but does **not** prove the student lives in that ward — only that they applied there. So S2 is interpreted differently for kiosk vs. self-service submissions.
- **Validation**: `ST_Contains(ward.geometry, application.submission_geo)` runs server-side. Stored on `applications.submission_geo` (`geometry(Point, 4326)` PostGIS column).

### 6.3 Trade-offs

| Decision | Pros | Cons | Verdict |
|---|---|---|---|
| **Triangulate 5 signals (recommended)** | No single point of failure; AI can score the agreement | More integration surface | **Adopt** |
| Require GPS hard-block | Strongest tech signal | DPA consent issue; excludes students whose phones lack GPS or whose schools block location services; unfair to honest users | Reject as hard block; keep as soft signal |
| Require chief's letter only (paper status quo) | Familiar; politically safe | Easily forged; doesn't compose with digital workflow | Reject — but support as the L5 fallback when village admin isn't yet onboarded digitally |
| Ward polygon validation only | Cheap | A spoofed GPS passes; a real student submitting from school fails | Reject as primary, keep as one signal |

### 6.4 Edge cases worth naming

- **Boarding-school student** submits from school in a different county. GPS will be outside their declared ward. Solution: the AI integrity check explicitly suppresses GPS-mismatch flagging when `academic_info.institution_type ∈ {SECONDARY_BOARDING, UNIVERSITY}`. Ward polygon validation moves from "evidence of residence" to "evidence of intake locality" only.
- **Pastoralist communities** (Turkana, Marsabit, etc.) with seasonal migration. The chief attestation is the right mechanism here; GPS data is meaningless. The county admin can disable GPS-signal weighting for the entire county via `counties.settings.location_policy = 'CHIEF_ONLY'`.
- **Disputed ward boundaries** between counties. PostGIS `ST_Contains` returns false in disputed zones. Add a buffer query: `ST_DWithin(ward.geometry, point, 500m)` as a "borderline" tolerance, surfaced as a soft warning.

---

## 7. Money Integrity: Ward → Village → Student Allocation Flow

The bursary fund's integrity rests on three nested invariants, each enforced atomically:

> **Invariant 1**: `Σ(ward_pools) ≤ program_budget`
> **Invariant 2**: `Σ(village_pools_in_ward) ≤ ward_pool`
> **Invariant 3**: `Σ(student_allocations_in_village) ≤ village_pool`

Money cannot move out of the system unless every level above is respected. Every `disbursement_records` row carries an FK chain back to the `village_budget_allocations` row that authorized it — which means every disbursed shilling is traceable to a named human (the village admin who allocated it) and a named pool (the village pool that funded it).

### 7.1 The five-stage flow

```
┌─────────────────────────────────────────────────────────────────┐
│ Stage 1: PROGRAM BUDGET                                         │
│   County Admin creates program with budget_ceiling = KES 50M    │
└────────────────────────────────┬────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│ Stage 2: WARD ALLOCATION (County → Ward)                        │
│   County allocates KES 5M to Katilu Ward                        │
│   (ward_budget_allocations row; Σ across wards ≤ program)       │
└────────────────────────────────┬────────────────────────────────┘
                                 │  ── students apply, ward eligibility review
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│ Stage 3: VILLAGE DISTRIBUTION (Ward Committee → Villages)       │
│   Ward committee splits 5M across villages by applicant count   │
│   - Lokichar village: 80 applicants → KES 1.20M                 │
│   - Lopusiki village: 50 applicants → KES 0.75M                 │
│   - Lochwa village:   30 applicants → KES 0.45M                 │
│   - … (Σ across villages = 5M; advisory lock on ward)           │
└────────────────────────────────┬────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│ Stage 4: STUDENT ALLOCATION (Village Admin → Students)          │
│   Village admin allocates from their village pool to students   │
│   - Student A (high need): KES 30K                              │
│   - Student B (medium need): KES 15K                            │
│   - … (Σ allocated ≤ village pool; advisory lock on village)    │
│   ★ THIS DECISION IS FINAL ★                                   │
└────────────────────────────────┬────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│ Stage 5: DISBURSEMENT (Finance Officer)                         │
│   Finance officer triggers M-Pesa B2C / EFT for approved        │
│   allocations. disbursement_records FK back to                  │
│   village_budget_allocation_id and ward_budget_allocation_id.   │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Why this matches Kenya's existing process

This is **not** a new bureaucracy — it digitizes the existing one. County bursary funds across Kenya operate via village-level committees (often 3–5 community members chaired by a village admin) who know the families and decide who needs help most. Bypassing this committee structure would be politically untenable and would lose the local-knowledge advantage. The system's job is to:

- Capture each committee decision as an immutable, auditable event.
- Enforce the financial invariants the committees are supposed to respect anyway.
- Give the committee a UI that's faster than paper.
- Provide the audit trail OCOB requires.

### 7.3 Distribution algorithm (Stage 3: Ward → Villages)

The default distribution is **proportional by applicant count**, matching the user's stated practice ("students with high number get more share"):

```
village_pool = (village_applicants_in_program / total_ward_applicants_in_program) × ward_pool
```

The system computes this automatically when the ward committee opens the distribution screen. The committee can then **adjust per-village amounts manually** (overriding the proposal). Common reasons:

- A village had many applicants but most are already covered by another fund.
- A village had few applicants but they're in extreme hardship.
- Boundary disputes meant some applicants belong to a different village.

The constraint is invariant: `Σ(village_pool) == ward_pool`. The UI surfaces a running total and **blocks "save" if the constraint isn't met**.

| Approach | Pros | Cons | Verdict |
|---|---|---|---|
| **Proportional + manual override (recommended)** | Matches existing practice; transparent default; flexible | Manual changes could be politicized | **Adopt** — every change audited |
| Pure proportional, no override | Maximum fairness signal | Doesn't match real-world committee discretion | Reject — politically untenable |
| Manual only (committee enters every value) | Maximum flexibility | Slow; no fairness anchor | Reject — proportional is a strong starting point |
| AI-weighted (need-based) | Most "fair" by need score | Counties don't yet trust AI to override committee judgement; would be a Year-2+ feature | Defer |

### 7.4 Override hierarchy and audit (when village admin is unavailable)

> **Policy locked with product**: village admin allocation is **final**. Other roles can act ONLY when the village admin is unavailable, and every override is logged.

**"Unavailable" is a structured condition** — any of:

- Village admin role vacant for the village_unit (no active assignment).
- Village admin marked `is_active = false` (e.g., on leave).
- Village allocation deadline passed without action (`village_allocation_due_at` < NOW()).
- County Admin explicitly marked the village admin as `temporarily_unavailable` (with reason).

**Override hierarchy** (each tier can act only if the tier(s) below are unavailable):

| Tier | Role | Can override | Use case |
|---|---|---|---|
| 1 (primary) | `VILLAGE_ADMIN` | Allocate to students in their village | Normal flow |
| 2 (fallback) | `WARD_ADMIN` | Allocate when village admin unavailable | Vacancy or deadline missed |
| 3 (escalation) | `COUNTY_ADMIN` | Allocate when both village and ward admins unavailable | Mass vacancy / disaster recovery |
| 4 (last resort) | `FINANCE_OFFICER` | Allocate when all above unavailable AND disbursement deadline approaching | Cycle close emergency |

**Every override creates a row in `application_timeline`** with:

- `event_type = 'ALLOCATION_OVERRIDE'`
- `actor_id` (the overriding user)
- `metadata.override_tier` (2 / 3 / 4)
- `metadata.original_village_admin_id` (if any)
- `metadata.override_reason_code` (`VILLAGE_ADMIN_VACANT` | `VILLAGE_ADMIN_INACTIVE` | `VILLAGE_DEADLINE_MISSED` | `EXPLICITLY_DELEGATED`)
- `metadata.override_reason_note` (free-text justification)

Server-side enforcement: the allocation endpoint **rejects** any override attempt where the village admin is reachable and within deadline. The override path is gated by the system's view of availability, not the overrider's claim.

The OCOB report is extended to surface override counts per village/ward so external auditors can spot anomalies (e.g., a ward where the ward admin overrode all 12 villages → strongly suspect).

### 7.5 Race condition handling (3-level advisory locks)

To prevent over-allocation under concurrent decisions, the existing single-level advisory lock pattern (`03-DATABASE-ARCHICTECTURE.md` §7) is extended to three nested levels:

```sql
BEGIN;  -- SERIALIZABLE
  -- Lock the program (Invariant 1)
  SELECT pg_advisory_xact_lock(hashtext('program:' || program_id));
  -- Lock the ward (Invariant 2)
  SELECT pg_advisory_xact_lock(hashtext('ward:' || program_id || ':' || ward_id));
  -- Lock the village (Invariant 3)
  SELECT pg_advisory_xact_lock(hashtext('village:' || program_id || ':' || village_unit_id));

  -- Verify: village_pool − village_allocated_total ≥ requested_amount
  -- Verify: ward_pool − ward_allocated_total ≥ requested_amount (defense in depth)
  -- Verify: program_budget − program_allocated_total ≥ requested_amount

  -- Insert allocation; update running totals at all 3 levels atomically
  -- Insert immutable timeline event
COMMIT;
```

Locks are nested in deterministic order (program → ward → village) to prevent deadlock. All locks are advisory transaction-scoped, so they release on COMMIT/ROLLBACK without operator intervention.

### 7.6 Disbursement integrity (FK chain)

Every `disbursement_records` row carries:

```sql
ALTER TABLE disbursement_records
  ADD COLUMN village_budget_allocation_id UUID REFERENCES village_budget_allocations(id),
  ADD COLUMN ward_budget_allocation_id   UUID REFERENCES ward_budget_allocations(id);
```

This enables one-line audit queries:

```sql
-- "Who authorized every shilling disbursed in Katilu Ward this cycle?"
SELECT a.id, a.submission_reference, d.amount_kes, d.transaction_id,
       u_village.email AS village_admin,
       u_ward.email    AS ward_committee_member,
       at.metadata     AS override_metadata
FROM disbursement_records d
JOIN applications a              ON a.id = d.application_id
JOIN village_budget_allocations v ON v.id = d.village_budget_allocation_id
JOIN users u_village              ON u_village.id = v.created_by
JOIN ward_budget_allocations w    ON w.id = d.ward_budget_allocation_id
JOIN users u_ward                 ON u_ward.id = w.created_by
LEFT JOIN application_timeline at ON at.application_id = a.id
                                 AND at.event_type = 'ALLOCATION_OVERRIDE'
WHERE a.ward_id = '<katilu-ward-id>'
  AND a.status = 'DISBURSED'
ORDER BY d.confirmed_at DESC;
```

This is the kind of query OCOB asks for. The pre-existing v1 schema cannot answer it cleanly because allocation authorship was implicit in `application_reviews`; with this design it becomes an explicit, query-first entity.

### 7.7 Status flow (extending the existing PRD lifecycle)

The PRD's existing application lifecycle (`01-PRD.md` RW-01) is `DRAFT → SUBMITTED → WARD_REVIEW → COUNTY_REVIEW → APPROVED → DISBURSED`. This design adds three intermediate stages between WARD_REVIEW and APPROVED:

```
DRAFT
  ↓
SUBMITTED
  ↓
WARD_REVIEW                 (ward admin: eligibility check)
  ↓
WARD_DISTRIBUTION_PENDING   (NEW — awaits ward committee village split)
  ↓
VILLAGE_ALLOCATION_PENDING  (NEW — village pool defined; awaits village admin)
  ↓
ALLOCATED                   (NEW — village admin set the amount; FINAL)
  ↓
COUNTY_REVIEW               (finance officer triggers disbursement; can override only per §7.4)
  ↓
APPROVED → DISBURSED
```

The new states are persisted on `applications.status` (existing column; extend the enum). Each state transition emits a timeline event as before.

### 7.8 Allocation flow design — combined trade-offs

| Decision | Pros | Cons | Verdict |
|---|---|---|---|
| **Village admin = primary, hierarchical override (recommended)** | Matches existing committee practice; clear accountability; subsidiarity | More roles to manage; slower than top-down | **Adopt** |
| Top-down only (Finance Officer allocates) | Faster; centralizes control | Loses local knowledge; politically infeasible | Reject |
| Flat (any reviewer can allocate) | Maximum flexibility | No accountability; over-allocation risk | Reject |
| Two-stage (ward recommends amount, county finalizes) | Existing v1 schema model | Doesn't surface village-level local knowledge | Reject — this is the v0 model we're replacing |

### 7.9 Schema additions (concrete SQL)

See §11 (Schema Deltas) for the complete `ward_budget_allocations`, `village_budget_allocations`, and `disbursement_records` extensions, including indexes and CHECK constraints.

---

## 8. Offline & Low-Tech Channels

The user has chosen the **full set of four channels**. The unifying principle is:

> Every channel ultimately produces the same canonical `Application` record, identified by a client-generated UUID idempotency key. There is no separate "offline application" entity in the API — only different ingest paths.

This is the same pattern Google uses for Forms / Drive offline: client-side persistence with deterministic IDs and server-side dedup on the natural key.

### 8.1 Channel matrix

| Channel | User profile | Device | Connectivity assumed | Document upload? | Throughput | Friction |
|---|---|---|---|---|---|---|
| **C1 PWA online** (existing) | Smartphone owner, decent connectivity | Android/iOS browser | Continuous | Yes | High | Low |
| **C2 PWA offline** (NEW) | Smartphone owner, intermittent connectivity | Android/iOS browser | Bursty, sometimes hours offline | Yes (queued) | Medium | Low |
| **C3 USSD** (NEW) | Feature-phone owner, no smartphone | Any GSM phone | Voice/USSD only | No (handoff) | Low | Medium |
| **C4 Ward-office kiosk / Field Agent** (NEW) | Anyone, especially low-literacy | Tablet at ward office | Field office Wi-Fi or 4G | Yes (tablet camera) | Medium | Very low for student; high for agent |
| **C5 Paper-to-digital** (NEW) | Anyone with paper-only access | n/a | n/a | After scan | Low | Very low for student; high for clerk |
| **SMS notifications** (existing) | Any user | Any GSM phone | SMS coverage | n/a | Universal | None |

### 8.2 C2 — PWA offline-first

**Pattern**: standard Service Worker + IndexedDB outbox.

- **Static asset shell** cached on first visit (ServiceWorker `install`).
- **Form state** persisted in IndexedDB on every section save. The store key is the client-generated `application_id` UUID.
- **Document uploads** queued: the file is stored in IndexedDB as a `Blob`, with an `outbox` entry referencing it. Background sync uploads via presigned S3 URL once connectivity returns.
- **Submission** writes to a special `outbox` queue. On reconnect, replay against `POST /applications/:id/submit` with the client-generated UUID as idempotency key. Server's existing `UNIQUE(applicant_id, program_id) WHERE status != 'WITHDRAWN'` index plus a new `client_idempotency_key` UUID handle dedup deterministically.

**Conflict cases:**

- Same application edited on two devices: last-write-wins per section, but `submitted_at` is monotonic. We don't need CRDTs because applications are single-owner.
- Connectivity returns after the program closing date: server returns `422 PROGRAM_CLOSED`; client surfaces this clearly with the option to download the filled PDF for paper fallback.

**Trade-off:**

| Approach | Pros | Cons | Verdict |
|---|---|---|---|
| **Service Worker + IndexedDB (recommended)** | Standard browser API; works on Android Chrome; no app-store dependency | iOS Safari has historic SW quirks; ~1MB JS bundle | **Adopt** |
| Native app | Best offline UX | App Store gatekeeping, larger team, conflicts with PRD non-goal | Reject (per PRD) |
| LocalStorage | Trivial to implement | 5MB cap, synchronous API blocks main thread, no Blob support | Reject |

### 8.3 C3 — USSD via Africa's Talking

USSD (Unstructured Supplementary Service Data) is **the** non-smartphone channel in Kenya. Feature phones, low literacy, near-universal coverage. M-Pesa runs on it.

**Constraints:**

- 182 characters per session screen.
- No images, no documents, no rich UX.
- 120-second session timeout; on timeout, state is lost unless persisted server-side.
- Numeric keypad input; Swahili and English only.

**What USSD CAN do well:**

- **Status check**: `*483*47#` (or county-specific) → menu → "Check application status" → enter national_id → status returned via flash SMS.
- **Stub registration**: Student dials in, identifies themselves with national_id + phone OTP (delivered via flash SMS), creates a STUB application. The stub is parked in `applications` with `status = 'DRAFT_USSD'` and a flag indicating `requires_assisted_completion`. Student is told via SMS to visit the ward office within 7 days to complete the form (handing off to C4 kiosk).
- **Disbursement OTP confirmation**: when M-Pesa B2C is initiated, USSD is the natural confirmation channel.

**What USSD CANNOT do:** Document upload, PDF preview, multi-section form. Trying to fit Sections A-G into USSD would be hostile UX.

**Trade-off:**

| Decision | Pros | Cons | Verdict |
|---|---|---|---|
| **USSD as discovery + status channel only** (recommended) | Reaches feature-phone users; cheap; familiar to Kenyans | Requires ward office handoff for full submission | **Adopt** |
| Full application via USSD | Reaches users without any smartphone access AND without ward office reach | Hostile UX; sections F+G impossible; AI scoring degraded by missing docs | Reject |
| No USSD | One less integration | Excludes the bottom decile of users entirely | Reject (per user decision: full set) |

**Cost**: Africa's Talking USSD is ~KES 1 per session. Budget KES 100K/year per county for status checks (assuming 5–10 status checks per applicant).

### 8.4 C4 — Ward-office kiosk / Field Agent

**The political-economy point**: every Kenyan ward already has a ward office, often co-located with the chief's camp. Stationing a tablet + a trained field agent there is the highest-bandwidth offline channel because it combines:

- A trusted-community physical location.
- A tablet camera for document capture.
- The presence of the village admin (enabling on-the-spot L5 attestation + allocation).
- A trained operator to guide low-literacy applicants.

**Design:**

- New role `FIELD_AGENT`, a county-employed user with a special permission set.
- Kiosk mode: a logged-in field agent enters "applicant mode" by tapping a button that requests a fresh phone OTP from the student. The OTP both verifies the student's phone AND signs a consent paper (printed at the kiosk, signed, photographed, uploaded as a `CONSENT_FORM` document type). This produces non-repudiation: the student demonstrably authorized the agent.
- The field agent fills sections A–F using the same wizard, takes photos of documents using the tablet camera (auto-cropping & deskewing via a lightweight on-device library — falls back to Claude Vision document analysis on the server).
- On submit, `applications.submission_channel = 'KIOSK'` and `applications.submission_device_id` is the registered tablet's UUID. The audit log distinguishes agent-assisted vs. self-service.
- Village admin can attest residence (and later allocate, per §7) in the same session: the field agent calls them over, the village admin reviews on the same tablet, signs into their own session, and completes the L5 attestation. End-to-end at the ward office.

**Quality gate**: every kiosk submission is flagged for ward admin manual spot-check during the first cycle. After confidence is built, sample-check at 5%.

**Trade-off:**

| Decision | Pros | Cons | Verdict |
|---|---|---|---|
| **Kiosk + field agent (recommended)** | Reaches the bottom decile; combines L5 attestation; physical trust signal | Capital cost (tablets); ongoing field-agent salary | **Adopt** |
| No kiosk; rely on PWA + USSD | Lower opex | Excludes low-literacy users; chief attestation can't co-locate easily | Reject (per user decision: full set) |
| Mobile field agents (visit homes) | Even higher reach | Massive opex; scheduling nightmare; not v1 | Defer to v2 |

**Capital model**: ~KES 30K per tablet; one tablet per ward = 1,450 tablets nationally (when fully rolled out) = KES 43.5M. This is amortized over the platform's contract life. Counties can fund this from their bursary admin budget (already accounting for ward office staffing).

### 8.5 C5 — Paper-to-digital intake

The county-gazetted paper form is the legal instrument; many students will still fill it out at home or at the ward office because they trust paper. We don't fight this — we ingest it.

**Design:**

- A new mode in the same kiosk UI: **"Paper Intake"**.
- The clerk feeds the paper form through the tablet camera. Claude Vision extracts text fields (this is what Claude does well) and pre-fills the wizard.
- Clerk reviews, corrects errors, and submits exactly as a kiosk submission. The original paper photo is stored as an `ORIGINAL_FORM` document type for audit.
- Throughput: an experienced clerk can do ~20 paper forms per hour at this rate (data point from similar projects in Rwanda's RSSB program).

**Why this matters for data integrity**: paper forms today are "lost in a drawer"; under this design they enter the same audit pipeline as digital ones, get AI-scored, and get tracked. This dramatically raises the floor of the worst-case data-integrity profile.

**Trade-off:**

| Decision | Pros | Cons | Verdict |
|---|---|---|---|
| **Paper intake mode (recommended)** | Captures the long tail; honors political-economy reality | Throughput-limited; Claude Vision OCR has error rate ~3% on Kenyan handwriting | **Adopt** |
| No paper intake | Lower complexity | Forces all paper into a "ghost" backlog the system never sees | Reject |
| Outsource to a digitization vendor | Higher throughput | Costlier; data leaves the county trust boundary | Defer; reconsider at scale |

### 8.6 SMS as the universal status backbone

Already in PRD. Reinforce in this design: **SMS is the only channel guaranteed to reach 100% of users, regardless of how they applied.** Every status transition emits an SMS regardless of submission channel. For C2/C3/C5 users, SMS is the *primary* communication; the portal is secondary.

### 8.7 Channel handoffs (the sequence diagram in words)

```
USSD discovery (C3) → SMS with link to portal (C1) OR
                    → SMS instructing visit to ward office (C4)

PWA offline (C2) → user goes online → background sync to API
                 → SMS confirms submission

Kiosk submission (C4) → optional village admin L5 attestation in same session
                      → submitted on the spot
                      → SMS to student confirming submission

Paper intake (C5) → digitized at kiosk → identical to C4 from the API's perspective
                  → SMS to student confirming intake
```

The student's experience is: "I applied. I got an SMS. I can check status by SMS or USSD." Channel is transparent.

### 8.8 Idempotency design (cross-channel)

Every channel produces a client-generated UUID stamped on the `applications` row as `client_idempotency_key`. Server-side, the unique index on `(applicant_id, program_id) WHERE status != 'WITHDRAWN'` plus a new unique index on `client_idempotency_key` makes the submission safely retryable. A retry from the offline outbox produces the same row, not a duplicate.

For pre-registration cases (USSD stub, paper intake before account exists), `applicant_id` is NULL until the student account is bound; we use a separate `pending_intake` table keyed by `client_idempotency_key` and reconciled at account-binding time. This is a small surface area — kept out of the hot path.

---

## 9. Defense-in-Depth Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SUBMISSION INTEGRITY STACK                      │
│                                                                     │
│  L1 Phone OTP   ─────────────────────► weak baseline                │
│  L2 X-county lock (HMAC) ────────────► one app/cycle/identity       │
│  L3 IPRS ────────────────────────────► identity is real             │
│  L4 NEMIS ───────────────────────────► school enrollment is real    │
│  L5 Village admin (attest + allocate) ► residence + final amount    │
│  L6 AI cross-app similarity ─────────► catches what L2-L5 missed    │
│                                                                     │
│  Plus location triangulation:                                       │
│  S1 Self-declared location ──────────┐                              │
│  S2 GPS at submission ───────────────┤                              │
│  S3 Ward polygon validation ─────────├──► location agreement score  │
│  S4 Proof-of-residence document ─────┤                              │
│  S5 Village admin attestation (= L5) ┘                              │
│                                                                     │
│  Channels: PWA online | PWA offline | USSD | Kiosk | Paper-to-digital
│  Universal backbone: SMS notifications                              │
└─────────────────────────────────────────────────────────────────────┘
```

No single layer can stop all four ghost-student types. The combination reduces the attack surface to **insider collusion** (Type D), which is then handled by the existing audit log + financial controls rather than identity verification.

---

## 10. Implementation Phasing

The work is significant. Order it so each phase produces independent value and can ship before the next is built.

### Phase 0 — Foundations (1–2 sprints)

- Geographic hierarchy normalization (`sub_counties`, `village_units` tables) — §4.5 migration plan.
- `client_idempotency_key` and `submission_channel` columns on `applications`.
- Seed authoritative ward boundaries (PostGIS) from IEBC shapefile.

**Ships**: cleaner reporting, no user-visible change.

### Phase 1 — Cross-county integrity (2–3 sprints)

- L2 platform-scoped `identity_registry` with HMAC.
- L6 AI scoring extended to query the registry.
- Birth-certificate-number support for minors (`student_profiles.birth_certificate_number`).
- Geo-stamp at submission (S2 + S3).

**Ships**: ghost-student Type C closed. Counties can audit cross-tenant duplicates.

### Phase 2 — External identity verification (2–3 sprints; gated by IPRS accreditation)

- L3 IPRS integration with caching + circuit breaker.
- L4 NEMIS integration as soft-evidence flag.

**Ships**: Type A and Type B largely closed. Government compliance posture upgraded.

### Phase 3 — Village admin attestation + allocation authority (3 sprints + a county pilot)

- `VILLAGE_ADMIN` role + UI.
- `residence_attestations` table + signed-PDF artifact (attestation half).
- `ward_budget_allocations` and `village_budget_allocations` tables + UIs (allocation half — see §7).
- Override audit semantics (§7.4) — Ward Admin / County Admin / Finance Officer can act only when village admin unavailable, with timeline entries.
- Onboarding playbook for county admins to register village admins per village_unit.

**Ships**: residence integrity dramatically up; allocation flow matches Kenya's existing village-bursary-committee process; politically aligns with existing chief-letter process.

### Phase 4 — Offline channels: PWA-offline (3 sprints)

- Service Worker + IndexedDB outbox.
- Background sync.
- E2E tests with simulated airplane-mode toggling.

**Ships**: smartphone users with poor connectivity unblocked.

### Phase 5 — Offline channels: Kiosk + Paper intake (4 sprints)

- `FIELD_AGENT` role + assisted-application UI.
- Tablet camera document capture flow.
- Paper-to-digital OCR (Claude Vision pre-fill).
- Field-agent training materials.
- Kiosk hardware procurement (one pilot county first).

**Ships**: offline last-mile reach.

### Phase 6 — USSD (2 sprints)

- Africa's Talking USSD application registered with platform shortcode.
- Status-check menu.
- Stub-registration handoff to ward office.

**Ships**: feature-phone users have a discovery channel.

**Total estimate**: ~16–20 sprints (8–10 months) for the full set, with shippable milestones every 4–6 weeks.

---

## 11. Schema & Module Deltas

The concrete database changes (additive, no destructive migrations to existing data) are:

```sql
-- §4: Geographic hierarchy
CREATE TABLE sub_counties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL REFERENCES counties(id),
  name VARCHAR(120) NOT NULL,
  code VARCHAR(20),
  geometry geometry(MultiPolygon, 4326),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(county_id, code),
  UNIQUE(county_id, name)
);

ALTER TABLE wards
  ADD COLUMN sub_county_id UUID REFERENCES sub_counties(id),
  ADD COLUMN geometry geometry(MultiPolygon, 4326);

CREATE TABLE village_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_id UUID NOT NULL REFERENCES wards(id),
  county_id UUID NOT NULL REFERENCES counties(id),
  name VARCHAR(120) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ward_id, name)
);

ALTER TABLE student_profiles
  ADD COLUMN village_unit_id UUID REFERENCES village_units(id);

-- §5: Identity verification fields
ALTER TABLE student_profiles
  ADD COLUMN birth_certificate_number BYTEA,         -- pgcrypto-encrypted
  ADD COLUMN iprs_verified_at TIMESTAMPTZ,
  ADD COLUMN iprs_verification_payload JSONB,        -- redacted audit trail
  ADD COLUMN nemis_upi VARCHAR(30),
  ADD COLUMN nemis_verified_at TIMESTAMPTZ;

-- §5.3 L2: Platform-scoped identity registry
CREATE TABLE identity_registry (
  identity_hash BYTEA PRIMARY KEY,                   -- HMAC-SHA256
  active_application_id UUID,
  active_county_id UUID NOT NULL REFERENCES counties(id),
  active_cycle VARCHAR(20) NOT NULL,
  first_registered_county_id UUID NOT NULL REFERENCES counties(id),
  first_registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_identity_active_cycle
  ON identity_registry(active_cycle, active_application_id);
-- NB: This table has NO county_id and RLS is NOT enabled — platform-scoped.

-- §5.3 L5: Village admin residence attestation
CREATE TABLE residence_attestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL REFERENCES counties(id),
  applicant_id UUID NOT NULL REFERENCES users(id),
  application_id UUID REFERENCES applications(id),
  attester_id UUID NOT NULL REFERENCES users(id),    -- VILLAGE_ADMIN role
  village_unit_id UUID NOT NULL REFERENCES village_units(id),
  ward_id UUID NOT NULL REFERENCES wards(id),
  attested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  signature_s3_key TEXT,
  notes TEXT
);

-- §6: Location verification
ALTER TABLE applications
  ADD COLUMN submission_geo geometry(Point, 4326),
  ADD COLUMN submission_geo_accuracy_m INTEGER,
  ADD COLUMN submission_channel VARCHAR(20) NOT NULL DEFAULT 'WEB',
  ADD COLUMN submission_device_id VARCHAR(60),
  ADD COLUMN client_idempotency_key UUID;

CREATE UNIQUE INDEX idx_applications_idempotency
  ON applications(client_idempotency_key)
  WHERE client_idempotency_key IS NOT NULL;

-- §7: Offline channels — pre-registration intake
CREATE TABLE pending_intake (
  client_idempotency_key UUID PRIMARY KEY,
  county_id UUID NOT NULL REFERENCES counties(id),
  channel VARCHAR(20) NOT NULL,                      -- USSD | PAPER
  contact_phone VARCHAR(20),
  contact_national_id_hash BYTEA,
  draft_data JSONB,
  expires_at TIMESTAMPTZ NOT NULL,
  promoted_to_application_id UUID REFERENCES applications(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- §7: Money integrity — Ward → Village budget allocation
CREATE TABLE ward_budget_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL REFERENCES counties(id),
  program_id UUID NOT NULL REFERENCES bursary_programs(id),
  ward_id UUID NOT NULL REFERENCES wards(id),
  allocated_kes DECIMAL(15,2) NOT NULL CHECK (allocated_kes >= 0),
  allocated_total_kes DECIMAL(15,2) NOT NULL DEFAULT 0,   -- running sum to villages
  disbursed_total_kes DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES users(id),          -- COUNTY_ADMIN or FINANCE_OFFICER
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(program_id, ward_id),
  CHECK (allocated_total_kes <= allocated_kes),           -- Invariant 2 at table level
  CHECK (disbursed_total_kes <= allocated_total_kes)
);
CREATE INDEX idx_ward_alloc_county ON ward_budget_allocations(county_id);
CREATE INDEX idx_ward_alloc_program ON ward_budget_allocations(program_id);
ALTER TABLE ward_budget_allocations ENABLE ROW LEVEL SECURITY;

CREATE TABLE village_budget_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL REFERENCES counties(id),
  program_id UUID NOT NULL REFERENCES bursary_programs(id),
  ward_budget_allocation_id UUID NOT NULL REFERENCES ward_budget_allocations(id),
  ward_id UUID NOT NULL REFERENCES wards(id),
  village_unit_id UUID NOT NULL REFERENCES village_units(id),
  allocated_kes DECIMAL(15,2) NOT NULL CHECK (allocated_kes >= 0),
  allocated_total_kes DECIMAL(15,2) NOT NULL DEFAULT 0,   -- running sum to students
  disbursed_total_kes DECIMAL(15,2) NOT NULL DEFAULT 0,
  applicant_count_at_distribution INTEGER NOT NULL,       -- snapshot for audit
  distribution_method VARCHAR(30) NOT NULL,               -- PROPORTIONAL | MANUAL_OVERRIDE | AI_WEIGHTED
  village_allocation_due_at TIMESTAMPTZ,                  -- §7.4 unavailability detector
  created_by UUID NOT NULL REFERENCES users(id),          -- WARD_ADMIN (committee chair)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(program_id, village_unit_id),
  CHECK (allocated_total_kes <= allocated_kes),           -- Invariant 3 at table level
  CHECK (disbursed_total_kes <= allocated_total_kes)
);
CREATE INDEX idx_village_alloc_county ON village_budget_allocations(county_id);
CREATE INDEX idx_village_alloc_ward ON village_budget_allocations(ward_budget_allocation_id);
CREATE INDEX idx_village_alloc_due ON village_budget_allocations(village_allocation_due_at)
  WHERE village_allocation_due_at IS NOT NULL;
ALTER TABLE village_budget_allocations ENABLE ROW LEVEL SECURITY;

-- §7: Application status enum extension (new states between WARD_REVIEW and COUNTY_REVIEW)
-- Existing values: DRAFT | SUBMITTED | WARD_REVIEW | COUNTY_REVIEW | APPROVED | REJECTED | WAITLISTED | DISBURSED | WITHDRAWN
-- New values:      WARD_DISTRIBUTION_PENDING | VILLAGE_ALLOCATION_PENDING | ALLOCATED
-- (When using a string column, no DDL is needed; when migrating to a Postgres enum, add via ALTER TYPE.)

-- §7: Application FK back to the village allocation that funded it (single source of truth)
ALTER TABLE applications
  ADD COLUMN village_budget_allocation_id UUID REFERENCES village_budget_allocations(id),
  ADD COLUMN ward_budget_allocation_id UUID REFERENCES ward_budget_allocations(id),
  ADD COLUMN allocation_actor_id UUID REFERENCES users(id),     -- who set amount_allocated
  ADD COLUMN allocation_actor_tier SMALLINT;                    -- 1=village 2=ward 3=county 4=finance

CREATE INDEX idx_applications_village_alloc ON applications(village_budget_allocation_id)
  WHERE village_budget_allocation_id IS NOT NULL;

-- §7.6: Disbursement integrity — FK chain to authorizing allocations
ALTER TABLE disbursement_records
  ADD COLUMN village_budget_allocation_id UUID REFERENCES village_budget_allocations(id),
  ADD COLUMN ward_budget_allocation_id UUID REFERENCES ward_budget_allocations(id);

-- Enforce: any disbursement must trace back to an allocation
ALTER TABLE disbursement_records
  ADD CONSTRAINT disbursement_must_have_village_alloc
  CHECK (status = 'PENDING' OR village_budget_allocation_id IS NOT NULL);

-- §7.4: Override audit — `application_timeline` already supports arbitrary metadata via JSONB,
-- so no schema change needed. Convention: event_type = 'ALLOCATION_OVERRIDE' with metadata
-- { override_tier, original_village_admin_id, override_reason_code, override_reason_note }.

-- §5.4, §7, §8.4 New roles
-- ALTER TYPE user_role ADD VALUE 'FIELD_AGENT';
-- ALTER TYPE user_role ADD VALUE 'VILLAGE_ADMIN';
```

### Module deltas (NestJS)

| Module | Change |
|---|---|
| `TenantModule` | Add sub-county/village_unit provisioning; village-admin assignment; field-agent assignment. |
| `ProfileModule` | Add IPRS + NEMIS integrations; birth-certificate field; cycle re-verification. |
| `ApplicationModule` | Geo-stamp at submit; idempotency key; submission_channel; cross-county lock check. |
| `ReviewModule` | New `VILLAGE_ADMIN` review type for `residence_attestations`; ward-allocation distribution flow. |
| `AllocationModule` (NEW) | Owns `ward_budget_allocations` + `village_budget_allocations`; enforces 3-level advisory locks; override hierarchy. |
| `IdentityModule` (NEW) | Owns `identity_registry`; HMAC computation; cross-county lookup. |
| `OfflineModule` (NEW) | Owns `pending_intake`; reconciles USSD and paper intake to applications. |
| `KioskModule` (NEW) | Field-agent assisted-application flow; tablet device registration; consent capture. |
| `USSDModule` (NEW) | Africa's Talking USSD callback handler; menu state machine. |

---

## 12. Open Questions & Risks

These need product, legal, or county-government input before implementation can be finalized.

### 12.1 Open questions

1. **IPRS accreditation** — is the platform accredited as a public-sector data consumer, or does each county hold the accreditation? This affects whether IPRS calls go from a single platform-level credential or 47 per-county credentials.
2. **Village admin digital readiness** — what fraction of village admins nationwide have smartphones and can plausibly log in to a digital portal? This dictates whether L5 ships in v1 nationally or only in the digitally-mature pilot counties.
3. **Cycle definition** — is "academic_year" the right unit, or should the platform support multiple intake phases per year (e.g., a county that runs Term 1 and Term 2 bursaries separately)? If multiple, the active-cycle key needs `(academic_year, phase)`.
4. **Cross-county legitimate movers** — for a family that moves from Turkana to Nairobi mid-year, the natural flow is: WITHDRAW Turkana application, apply in Nairobi. Is this acceptable to product, or do we need an explicit county-transfer flow with admin approval?
5. **Geo-fence buffer for boundary disputes** — what tolerance (in meters) is acceptable for ward polygon validation in disputed areas? Need political guidance.
6. **Paper-intake legal status** — does a digitized paper form count as the "submitted application" for legal/audit purposes, or is the paper form itself the canonical record? This affects retention requirements.
7. **Field-agent compensation model** — county budgets vs. platform revenue share. Affects rollout feasibility per county.
8. **USSD shortcode model** — single platform shortcode (e.g., `*483*47#`) or per-county shortcodes? Same trade-off as M-Pesa B2C.

### 12.2 Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| IPRS API instability or pricing change | Medium | High | Caching + circuit breaker; degrade to L5 attestation as fallback. |
| Village admins slow to adopt digital flow | High in Year 1 | Medium | Hybrid: ward admin can record an offline chief/committee letter as an attestation (with photo of the paper letter). Override hierarchy in §7.4 picks up the slack with full audit. |
| Service Worker quirks on iOS Safari | Medium | Medium | Targeted E2E tests; document known limitations; degrade to online-only if SW unsupported. |
| USSD session timeouts breaking flows | High | Low | Server-side state per `phone_number`; 24h state retention. |
| Field-agent fraud (collusion) | Medium | High | Spot-check audit; M-Pesa disbursement only to phone registered at student account creation; mismatch flagged. |
| Village admin stamp/signature forgery in paper intake | Medium | Medium | Digital attestation gradually replaces paper; transition period requires admin manual review. |
| Migration of free-text village data produces unresolved entries | High | Low | `migration_unresolved` audit table reviewed by county admin before drop of old columns. |
| Privacy concern: GPS at submission considered intrusive | Medium | Medium | Explicit DPA-compliant consent screen; no hard block; clear retention policy on `submission_geo` (drop after 7-year audit window). |

---

## 13. Cost & Latency Estimates

### 13.1 Per-application cost (Year 1, 50K applications)

| Item | Unit cost | Per-app cost | Annual cost |
|---|---|---|---|
| Phone OTP (existing) | KES 1/SMS | KES 1 | KES 50K |
| L2 cross-county lookup | DB query | KES ~0 | ~0 |
| L3 IPRS verification | KES 10 | KES 10 (cached after first cycle) | KES 500K |
| L4 NEMIS | Government-free | KES 0 | KES 0 |
| L5 Village admin attestation + allocation | County-salaried; +0 marginal | KES 0 | KES 0 |
| L6 AI similarity (Claude tokens) | KES 2 | KES 2 | KES 100K |
| Status SMS (3/applicant) | KES 1 × 3 | KES 3 | KES 150K |
| USSD sessions (5/applicant avg) | KES 1 | KES 5 | KES 250K |
| **Total identity + comms** | | **KES 21** | **KES 1.05M** |
| Field-agent salary (per ward, full-time) | — | — | KES 30K × 12 × 1,450 = KES 522M (national, fully-staffed) |
| Tablet capex (per ward, amortized 3 years) | KES 30K | — | KES 14.5M (national) |

The platform costs are immaterial compared to the **paper-form fraud loss** the design prevents. A typical county disburses KES 200M–500M per year; even a 1% fraud reduction recovers KES 2M–5M, dwarfing the integrity stack cost.

### 13.2 Latency budget (submission path)

| Stage | Target P95 |
|---|---|
| Section save (existing) | <500ms |
| Final submit excluding L3 | <500ms |
| L3 IPRS call | <800ms (cached subsequently) |
| L4 NEMIS call | <500ms |
| Cross-county L2 lookup | <50ms |
| Geo polygon validation | <50ms |
| **Total submit P95** | **<2.5s** (cold first cycle); <1s (subsequent) |

### 13.3 Storage growth

The new tables are negligible relative to existing footprint:

- `identity_registry`: ~64 bytes/row × 500K identities (Year 3 fully-loaded) = ~32 MB.
- `residence_attestations`: ~200 bytes/row × 500K attestations/year = ~100 MB/year.
- `pending_intake`: short-lived rows; <10 MB at any time.
- PostGIS geometry: ~5 KB per ward × 1,450 wards = ~7 MB.

Trivial.

---

## Appendix A — Recommended next decisions

To unblock implementation, product + engineering need to decide:

1. **IPRS accreditation path** — platform-level vs. per-county.
2. **Cycle key** — `academic_year` only, or `(academic_year, phase)`.
3. **Village admin rollout** — all counties in Phase 3, or pilot 1 county first; how to handle counties whose existing village committees are not yet digitized.
4. **Tablet procurement** — county-funded, platform-funded, or co-funded.
5. **USSD shortcode** — shared platform shortcode (`*483*47#`) or per-county shortcodes.

Each of these is independent of the architecture; the architecture supports either side of every decision.

---

## Appendix B — Cross-references

- **`Docs/01-PRD.md`** — base PRD; this design extends §5.3 (SP-03), §11 (risks), §3.2 (non-goals: USSD/native moved into roadmap).
- **`Docs/02-SYSTEM_DESIGN.md`** — modular monolith; new modules `IdentityModule`, `OfflineModule`, `KioskModule`, `USSDModule` extend §5.1.
- **`Docs/03-DATABASE-ARCHICTECTURE.md`** — schema deltas in §10 above are additive to existing schema; no destructive changes.
- **`Docs/04-API-DESIGN.md`** — to be amended with: `POST /applications/:id/submit` accepting `client_idempotency_key`, `submission_geo`; new endpoints under `/internal/identity`, `/internal/iprs`, `/internal/nemis`, `/village-admin/attestations`, `/village-admin/allocations`, `/ward/budget-distributions`, `/kiosk/sessions`, `/ussd/callback`.
- **`Docs/07-TESTING-STRATEGY.md`** — extend with: cross-county dedup tests, IPRS mock contract tests, offline sync E2E tests (Playwright with `context.setOffline(true)`).

---

## Appendix C — Glossary

| Term | Meaning |
|---|---|
| **IPRS** | Integrated Population Registration System — Government of Kenya's authoritative identity database. |
| **NEMIS** | National Education Management Information System — MoE Kenya's student registry. |
| **UPI** | Unique Personal Identifier — NEMIS-issued student number. |
| **HELB** | Higher Education Loans Board — already in PRD. |
| **OCOB** | Office of the Controller of Budget — Kenyan financial oversight body. |
| **Village Admin** | County-appointed bursary-committee member at the village level; in this design, holds both residence-attestation and final-allocation authority for their village. |
| **Sub-location** | National-government administrative unit below location; orthogonal to but roughly co-located with the county-government's village_unit used in this design. |
| **PWA** | Progressive Web App — browser-installed app with offline capability. |
| **USSD** | Unstructured Supplementary Service Data — text menu over GSM signaling channel. |
| **CRDT** | Conflict-free Replicated Data Type — not used here because applications are single-owner. |
| **HMAC** | Hash-based Message Authentication Code — keyed deterministic hash. |
| **DPA** | (Kenya) Data Protection Act 2019. |
| **Cycle** | An intake window keyed by `academic_year` (e.g., `2024/2025`). |
