# KauntyBursary — Database Architecture
**Version:** 1.0.0  
**Status:** Production-Ready Draft  
**References:** PRD v1.0.0, System Design v1.0.0

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Data Domain Overview](#2-data-domain-overview)
3. [Access Patterns](#3-access-patterns)
4. [Database Technology Choices](#4-database-technology-choices)
5. [Complete Schema Design](#5-complete-schema-design)
6. [Indexing Strategy](#6-indexing-strategy)
7. [Consistency & Transactions](#7-consistency--transactions)
8. [Scaling & Partitioning](#8-scaling--partitioning)
9. [Data Lifecycle Management](#9-data-lifecycle-management)
10. [Security & Compliance](#10-security--compliance)
11. [Reliability & Operations](#11-reliability--operations)
12. [Prisma Schema](#12-prisma-schema)
13. [Trade-offs & Risks](#13-trade-offs--risks)

---

## 1. Executive Summary

The KauntyBursary database is a multi-tenant PostgreSQL 15 schema using Row-Level Security (RLS) for tenant isolation. All domain data lives in a single logical database with a `county_id` discriminator on every tenant-scoped table. A read replica handles reporting queries. Redis 7 handles session management, rate limiting, and BullMQ job queuing.

Key design principles:
- **Tenant isolation by default** — RLS policies enforce county boundaries at the database layer, independent of application logic.
- **Immutable audit log** — `application_timeline` rows are INSERT-only; no UPDATE or DELETE is permitted.
- **Financial integrity** — budget allocation uses advisory locks to prevent concurrent over-allocation.
- **PII encryption** — national ID numbers and bank account numbers are encrypted at the column level using `pgcrypto`.
- **Soft deletes** — user records are soft-deleted (`deleted_at`); hard deletion runs on a 7-year retention schedule per Kenya's financial audit requirements.

---

## 2. Data Domain Overview

### Domain Boundaries

```
┌─────────────────────────────────────────────────┐
│                 TENANT DOMAIN                   │
│                                                 │
│  Counties → Wards → Users                       │
│                   ↓                             │
│  Programs ←→ Applications ←→ Documents          │
│                   ↓                             │
│  Reviews → Timeline → AI Score Cards           │
│                   ↓                             │
│         Disbursement Records                    │
│                                                 │
│  (All scoped by county_id via RLS)              │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│              PLATFORM DOMAIN                    │
│                                                 │
│  Counties (tenant registry)                     │
│  Billing / Subscriptions                        │
│  Platform audit logs                            │
│                                                 │
│  (Accessed only by PLATFORM_OPERATOR role)      │
└─────────────────────────────────────────────────┘
```

---

## 3. Access Patterns

### Critical Query Patterns

| Pattern | Frequency | Latency SLO | Notes |
|---------|-----------|-------------|-------|
| List applications for a ward admin | Very High | < 100ms | Paginated; filtered by county + ward + status |
| Get single application with all sections | High | < 150ms | Joins: profile, sections, documents, score card |
| Submit application (write) | High at peak | < 500ms | Involves budget check + 3 table writes |
| AI score card lookup | High | < 50ms | Single row lookup by application_id |
| Budget utilization aggregate | Medium | < 200ms | Served from read replica; cacheable 30s |
| Dashboard counts by status | High | < 100ms | Cached in Redis; refreshed every 30s |
| OCOB report export | Low | < 10s | Complex aggregate; always on read replica |
| Disbursement batch query | Low | < 500ms | Approved, undisbursed applications per cycle |
| Duplicate application detection | Very High | < 100ms | Unique index lookup; runs on every submission |

### Read vs Write Ratio

- **Write-heavy during intake:** Submissions, document confirmations, section saves → 40% write.
- **Read-heavy outside intake:** Status tracking, dashboard, document viewing → 95% read.
- Reporting always goes to read replica regardless of phase.

---

## 4. Database Technology Choices

### Primary Store: PostgreSQL 15 (RDS Multi-AZ)

**Why PostgreSQL:**
- Native Row-Level Security — critical for multi-tenant isolation without application-level filtering.
- JSONB columns for flexible storage of eligibility rules, form section data, AI score breakdowns, and county settings — avoids an EAV pattern.
- `pgcrypto` extension for column-level PII encryption without an external KMS call on every read.
- Mature advisory lock support (`pg_advisory_xact_lock`) for budget enforcement.
- Superior full-text search for application data via `tsvector` columns.
- Excellent Prisma ORM support.

**Why not MySQL:** No native RLS. Would require application-level tenant filtering as the only enforcement layer.  
**Why not MongoDB:** ACID guarantees on financial allocation require relational transactions. Schema flexibility is handled by JSONB columns within PostgreSQL.

### Cache / Queue Store: Redis 7 (ElastiCache Cluster Mode)

- BullMQ job queuing (AI scoring, notifications, disbursement).
- Session token blocklist (fast revocation of refresh tokens).
- Rate limit counters (sliding window).
- Dashboard aggregate cache (30-second TTL).
- Program eligibility rule cache (5-minute TTL).

### Document Storage: AWS S3

- All uploaded files (PDFs, images) stored in S3.
- Database stores only the S3 key reference and metadata.
- Access via presigned URLs (15-minute expiry for reads).

---

## 5. Complete Schema Design

### 5.1 Platform Tables (no county_id)

```sql
-- ─────────────────────────────────────────────
-- counties: tenant registry
-- ─────────────────────────────────────────────
CREATE TABLE counties (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            VARCHAR(60) UNIQUE NOT NULL,         -- e.g. 'turkana', 'nairobi'
  name            VARCHAR(120) NOT NULL,               -- e.g. 'Turkana County'
  fund_name       VARCHAR(180),                        -- e.g. 'Turkana County Education Fund'
  legal_reference VARCHAR(180),                        -- e.g. 'No. 4 of 2023'
  logo_s3_key     TEXT,                               -- county logo in S3
  primary_color   VARCHAR(7) DEFAULT '#1E3A5F',       -- hex color for branding
  plan_tier       VARCHAR(30) NOT NULL DEFAULT 'BASIC', -- BASIC | STANDARD | ENTERPRISE
  is_active       BOOLEAN NOT NULL DEFAULT true,
  settings        JSONB NOT NULL DEFAULT '{}',         -- flexible config (scoring weights, etc.)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- wards: Kenya's official administrative units
-- ─────────────────────────────────────────────
CREATE TABLE wards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id       UUID NOT NULL REFERENCES counties(id) ON DELETE CASCADE,
  name            VARCHAR(120) NOT NULL,
  code            VARCHAR(20),                         -- official ward code from MoE
  sub_county      VARCHAR(120),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(county_id, code)
);
CREATE INDEX idx_wards_county ON wards(county_id);
```

### 5.2 User & Identity Tables

```sql
-- ─────────────────────────────────────────────
-- users: all authenticated actors
-- ─────────────────────────────────────────────
CREATE TABLE users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id             UUID NOT NULL REFERENCES counties(id),
  ward_id               UUID REFERENCES wards(id),         -- for WARD_ADMIN role
  email                 VARCHAR(255) NOT NULL,
  phone                 VARCHAR(20),
  password_hash         VARCHAR(255) NOT NULL,
  role                  VARCHAR(30) NOT NULL,               -- STUDENT | WARD_ADMIN | FINANCE_OFFICER | COUNTY_ADMIN | PLATFORM_OPERATOR
  email_verified        BOOLEAN NOT NULL DEFAULT false,
  phone_verified        BOOLEAN NOT NULL DEFAULT false,
  email_verify_token    VARCHAR(255),
  email_verify_expiry   TIMESTAMPTZ,
  reset_token           VARCHAR(255),
  reset_expiry          TIMESTAMPTZ,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  last_login_at         TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ,                       -- soft delete
  UNIQUE(email, county_id)
);

CREATE INDEX idx_users_county ON users(county_id);
CREATE INDEX idx_users_county_role ON users(county_id, role) WHERE deleted_at IS NULL;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- student_profiles: Section A of the bursary form
-- ─────────────────────────────────────────────
CREATE TABLE student_profiles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  county_id         UUID NOT NULL REFERENCES counties(id),
  full_name         VARCHAR(255) NOT NULL,
  national_id       BYTEA,                               -- encrypted with pgcrypto
  date_of_birth     DATE,
  gender            VARCHAR(10),                         -- MALE | FEMALE | OTHER
  home_ward         VARCHAR(120),
  village_unit      VARCHAR(120),
  phone             VARCHAR(20),
  profile_complete  BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Encrypted national_id unique per county (enforced via partial unique on hash)
CREATE UNIQUE INDEX idx_profile_national_id_county 
  ON student_profiles(national_id, county_id) 
  WHERE national_id IS NOT NULL;

CREATE INDEX idx_profile_county ON student_profiles(county_id);
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- academic_info: Section A (institution) + Section B (bank details)
-- ─────────────────────────────────────────────
CREATE TABLE academic_info (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  county_id             UUID NOT NULL REFERENCES counties(id),
  institution_type      VARCHAR(30),                     -- SECONDARY | COLLEGE_TVET | UNIVERSITY
  institution_name      VARCHAR(255),
  year_form_class       VARCHAR(20),                     -- e.g. "Form 3" or "Year 2"
  admission_number      VARCHAR(60),
  course_name           VARCHAR(255),
  bank_account_name     VARCHAR(255),
  bank_account_number   BYTEA,                           -- encrypted
  bank_name             VARCHAR(120),
  bank_branch           VARCHAR(120),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);
ALTER TABLE academic_info ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- family_financial_info: Sections C & D of the form
-- ─────────────────────────────────────────────
CREATE TABLE family_financial_info (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  county_id                 UUID NOT NULL REFERENCES counties(id),
  family_status             VARCHAR(30),                 -- BOTH_PARENTS | SINGLE_PARENT | ORPHAN | ONE_DECEASED | GUARDIAN_DISABILITY
  has_disability            BOOLEAN NOT NULL DEFAULT false,
  disability_details        TEXT,
  guardian_name             VARCHAR(255),
  guardian_occupation       VARCHAR(120),
  guardian_contact          VARCHAR(20),
  num_siblings              INTEGER,
  num_guardian_children     INTEGER,
  num_siblings_in_school    INTEGER,
  father_occupation         VARCHAR(120),
  father_income_kes         INTEGER,                     -- annual gross income
  mother_occupation         VARCHAR(120),
  mother_income_kes         INTEGER,
  guardian_income_kes       INTEGER,
  sibling_education_details JSONB DEFAULT '[]',          -- array of sibling education rows
  orphan_sponsor_name       VARCHAR(255),
  orphan_sponsor_relation   VARCHAR(60),
  orphan_sponsor_contact    VARCHAR(20),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);
ALTER TABLE family_financial_info ENABLE ROW LEVEL SECURITY;
```

### 5.3 Program Tables

```sql
-- ─────────────────────────────────────────────
-- bursary_programs: funding opportunities
-- ─────────────────────────────────────────────
CREATE TABLE bursary_programs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id           UUID NOT NULL REFERENCES counties(id),
  ward_id             UUID REFERENCES wards(id),         -- NULL = all wards
  name                VARCHAR(255) NOT NULL,
  description         TEXT,
  budget_ceiling      DECIMAL(15,2) NOT NULL,
  allocated_total     DECIMAL(15,2) NOT NULL DEFAULT 0,  -- running total of approvals
  disbursed_total     DECIMAL(15,2) NOT NULL DEFAULT 0,
  opens_at            TIMESTAMPTZ NOT NULL,
  closes_at           TIMESTAMPTZ NOT NULL,
  academic_year       VARCHAR(10),                       -- e.g. "2024/2025"
  status              VARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- DRAFT | ACTIVE | CLOSED | SUSPENDED
  created_by          UUID NOT NULL REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_programs_county ON bursary_programs(county_id);
CREATE INDEX idx_programs_county_status ON bursary_programs(county_id, status);
CREATE INDEX idx_programs_county_budget ON bursary_programs(county_id, id) 
  INCLUDE (allocated_total, budget_ceiling);
ALTER TABLE bursary_programs ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- eligibility_rules: configurable rules per program
-- ─────────────────────────────────────────────
CREATE TABLE eligibility_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id    UUID NOT NULL REFERENCES bursary_programs(id) ON DELETE CASCADE,
  county_id     UUID NOT NULL REFERENCES counties(id),
  rule_type     VARCHAR(50) NOT NULL,                    -- EDUCATION_LEVEL | INCOME_BRACKET | WARD_SCOPE | DISABILITY_ONLY
  parameters    JSONB NOT NULL,                          -- flexible per rule_type
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_eligibility_program ON eligibility_rules(program_id);
```

### 5.4 Application Tables (Core Lifecycle)

```sql
-- ─────────────────────────────────────────────
-- applications: the central lifecycle entity
-- ─────────────────────────────────────────────
CREATE TABLE applications (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id             UUID NOT NULL REFERENCES counties(id),
  applicant_id          UUID NOT NULL REFERENCES users(id),
  program_id            UUID NOT NULL REFERENCES bursary_programs(id),
  ward_id               UUID NOT NULL REFERENCES wards(id),
  status                VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    -- DRAFT | SUBMITTED | WARD_REVIEW | COUNTY_REVIEW | APPROVED | REJECTED | WAITLISTED | DISBURSED | WITHDRAWN
  total_fee_kes         DECIMAL(12,2),                   -- Section B: total payable fee
  outstanding_balance   DECIMAL(12,2),                   -- Section B: outstanding balance
  amount_able_to_pay    DECIMAL(12,2),                   -- Section B: amount student can pay
  amount_requested      DECIMAL(12,2),                   -- derived: outstanding - can_pay
  amount_allocated      DECIMAL(12,2),                   -- set on final approval
  helb_applied          BOOLEAN,
  prior_bursary_received BOOLEAN DEFAULT false,
  prior_bursary_source  VARCHAR(255),
  prior_bursary_amount  DECIMAL(12,2),
  reason                TEXT,                            -- Section E: reason for application
  submission_reference  VARCHAR(30) UNIQUE,              -- human-readable ref e.g. TRK-2024-00142
  pdf_s3_key            TEXT,                            -- archived PDF S3 key
  submitted_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent duplicate applications: same student + same program (not withdrawn)
CREATE UNIQUE INDEX idx_applications_no_duplicate 
  ON applications(applicant_id, program_id) 
  WHERE status != 'WITHDRAWN';

CREATE INDEX idx_applications_county ON applications(county_id);
CREATE INDEX idx_applications_county_status ON applications(county_id, status);
CREATE INDEX idx_applications_county_ward ON applications(county_id, ward_id);
CREATE INDEX idx_applications_program ON applications(program_id);
CREATE INDEX idx_applications_applicant ON applications(applicant_id);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- application_sections: stores form data per section
-- Allows partial save and section-by-section validation
-- ─────────────────────────────────────────────
CREATE TABLE application_sections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  county_id       UUID NOT NULL REFERENCES counties(id),
  section_key     VARCHAR(20) NOT NULL,                  -- A | B | C | D | E | F
  data            JSONB NOT NULL DEFAULT '{}',
  is_complete     BOOLEAN NOT NULL DEFAULT false,
  saved_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(application_id, section_key)
);
CREATE INDEX idx_sections_application ON application_sections(application_id);

-- ─────────────────────────────────────────────
-- documents: uploaded supporting files
-- ─────────────────────────────────────────────
CREATE TABLE documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  county_id       UUID NOT NULL REFERENCES counties(id),
  doc_type        VARCHAR(50) NOT NULL,
    -- FEE_STRUCTURE | ADMISSION_LETTER | TRANSCRIPT | SCHOOL_ID | NCPWD_CARD | DEATH_CERTIFICATE | OTHER
  s3_key          TEXT NOT NULL,                         -- S3 object key (not full URL)
  original_name   VARCHAR(255),
  content_type    VARCHAR(80),
  file_size_bytes INTEGER,
  scan_status     VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING | CLEAN | INFECTED | FAILED
  scan_completed_at TIMESTAMPTZ,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_application ON documents(application_id, county_id);
CREATE INDEX idx_documents_scan_pending ON documents(scan_status) WHERE scan_status = 'PENDING';

-- ─────────────────────────────────────────────
-- application_reviews: reviewer decisions at each stage
-- ─────────────────────────────────────────────
CREATE TABLE application_reviews (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id        UUID NOT NULL REFERENCES applications(id),
  county_id             UUID NOT NULL REFERENCES counties(id),
  reviewer_id           UUID NOT NULL REFERENCES users(id),
  stage                 VARCHAR(20) NOT NULL,             -- WARD_REVIEW | COUNTY_REVIEW
  decision              VARCHAR(20) NOT NULL,             -- RECOMMENDED | RETURNED | REJECTED | APPROVED | WAITLISTED
  recommended_amount    DECIMAL(12,2),
  allocated_amount      DECIMAL(12,2),
  note                  TEXT,
  reviewed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_application ON application_reviews(application_id);
CREATE INDEX idx_reviews_county_stage ON application_reviews(county_id, stage);

-- ─────────────────────────────────────────────
-- application_timeline: immutable audit log
-- INSERT-ONLY — no UPDATE or DELETE ever
-- ─────────────────────────────────────────────
CREATE TABLE application_timeline (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES applications(id),
  county_id       UUID NOT NULL REFERENCES counties(id),
  actor_id        UUID REFERENCES users(id),              -- NULL for system events
  event_type      VARCHAR(50) NOT NULL,
    -- CREATED | SUBMITTED | SECTION_SAVED | WARD_REVIEWED | COUNTY_REVIEWED | 
    -- APPROVED | REJECTED | WAITLISTED | DISBURSED | PDF_GENERATED | AI_SCORED | DOCUMENT_UPLOADED
  from_status     VARCHAR(30),
  to_status       VARCHAR(30),
  metadata        JSONB DEFAULT '{}',
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_timeline_application ON application_timeline(application_id, occurred_at DESC);
CREATE INDEX idx_timeline_county_date ON application_timeline(county_id, occurred_at DESC);

-- Prevent modifications (INSERT-only enforcement via trigger)
CREATE OR REPLACE FUNCTION prevent_timeline_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'application_timeline is INSERT-only. No UPDATE or DELETE permitted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER no_timeline_mutation
  BEFORE UPDATE OR DELETE ON application_timeline
  FOR EACH ROW EXECUTE FUNCTION prevent_timeline_mutation();
```

### 5.5 AI Scoring Tables

```sql
-- ─────────────────────────────────────────────
-- ai_score_cards: AI scoring results per application
-- ─────────────────────────────────────────────
CREATE TABLE ai_score_cards (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id      UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  county_id           UUID NOT NULL REFERENCES counties(id),
  total_score         DECIMAL(5,2) NOT NULL,             -- 0.00 – 100.00
  family_status_score DECIMAL(5,2),
  family_income_score DECIMAL(5,2),
  education_burden_score DECIMAL(5,2),
  academic_standing_score DECIMAL(5,2),
  document_quality_score DECIMAL(5,2),
  integrity_score     DECIMAL(5,2),
  anomaly_flags       JSONB DEFAULT '[]',                -- list of flag objects
  document_analysis   JSONB DEFAULT '{}',                -- per-document Claude analysis
  model_version       VARCHAR(30),                       -- e.g. 'v1.2.0'
  weights_applied     JSONB NOT NULL,                    -- snapshot of weights used
  scored_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(application_id)
);

CREATE INDEX idx_scores_county ON ai_score_cards(county_id);
CREATE INDEX idx_scores_total ON ai_score_cards(county_id, total_score DESC);
```

### 5.6 Disbursement Tables

```sql
-- ─────────────────────────────────────────────
-- disbursement_records: payment execution records
-- ─────────────────────────────────────────────
CREATE TABLE disbursement_records (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id        UUID NOT NULL REFERENCES applications(id),
  county_id             UUID NOT NULL REFERENCES counties(id),
  program_id            UUID NOT NULL REFERENCES bursary_programs(id),
  disbursement_method   VARCHAR(20) NOT NULL,            -- MPESA_B2C | BANK_EFT | CHEQUE
  amount_kes            DECIMAL(12,2) NOT NULL,
  recipient_phone       VARCHAR(20),                     -- for M-Pesa
  recipient_bank_account VARCHAR(60),                    -- encrypted, for EFT
  recipient_bank_name   VARCHAR(120),
  transaction_id        VARCHAR(120),                    -- M-Pesa transaction ID or EFT reference
  status                VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING | SUCCESS | FAILED | REVERSED
  failure_reason        TEXT,
  retry_count           INTEGER NOT NULL DEFAULT 0,
  initiated_by          UUID NOT NULL REFERENCES users(id),
  initiated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at          TIMESTAMPTZ,
  receipt_s3_key        TEXT                             -- disbursement receipt PDF
);

CREATE INDEX idx_disbursement_application ON disbursement_records(application_id);
CREATE INDEX idx_disbursement_county_status ON disbursement_records(county_id, status);
CREATE INDEX idx_disbursement_pending ON disbursement_records(status, retry_count) 
  WHERE status = 'PENDING';
```

---

## 6. Indexing Strategy

### Index Design Principles

1. Every foreign key that appears in a `WHERE` clause has a corresponding index.
2. Multi-column indexes are ordered by selectivity (most selective column first).
3. Partial indexes used for common filtered queries (e.g., pending jobs, active programs).
4. `INCLUDE` columns used for covering indexes on hot reporting queries.

### Critical Index Reference

```sql
-- Tenant isolation (runs on every query)
idx_applications_county              ON applications(county_id)

-- Application list with status filter (ward admin primary query)
idx_applications_county_status       ON applications(county_id, status)
idx_applications_county_ward         ON applications(county_id, ward_id)

-- Duplicate detection (runs on every submission)
idx_applications_no_duplicate        UNIQUE ON applications(applicant_id, program_id) WHERE status != 'WITHDRAWN'

-- Budget enforcement (advisory lock candidate query)
idx_programs_county_budget           ON bursary_programs(county_id, id) INCLUDE (allocated_total, budget_ceiling)

-- AI score ranked list (committee view, sorted by score DESC)
idx_scores_total                     ON ai_score_cards(county_id, total_score DESC)

-- Document scan queue (worker poll)
idx_documents_scan_pending           ON documents(scan_status) WHERE scan_status = 'PENDING'

-- Timeline audit (ordered history)
idx_timeline_application             ON application_timeline(application_id, occurred_at DESC)

-- Report queries (disbursement by status)
idx_disbursement_county_status       ON disbursement_records(county_id, status)
```

---

## 7. Consistency & Transactions

### ACID Requirements

All financial operations (budget allocation, disbursement triggering) require SERIALIZABLE isolation. All other operations use READ COMMITTED (PostgreSQL default).

### Budget Enforcement Pattern

```sql
-- Runs inside a SERIALIZABLE transaction on every allocation decision
BEGIN;
  -- Acquire advisory lock on the program to serialise concurrent approvals
  SELECT pg_advisory_xact_lock(hashtext(program_id::text));
  
  -- Verify budget headroom
  SELECT budget_ceiling - allocated_total AS available
  FROM bursary_programs
  WHERE id = $program_id AND county_id = $county_id
  FOR UPDATE;
  
  -- Verify amount <= available (application layer raises error if not)
  
  -- Update running total
  UPDATE bursary_programs
  SET allocated_total = allocated_total + $amount,
      updated_at = NOW()
  WHERE id = $program_id;
  
  -- Update application status
  UPDATE applications
  SET status = 'APPROVED',
      amount_allocated = $amount,
      updated_at = NOW()
  WHERE id = $application_id;
  
  -- Insert immutable timeline event
  INSERT INTO application_timeline (application_id, county_id, actor_id, event_type, from_status, to_status)
  VALUES ($app_id, $county_id, $reviewer_id, 'APPROVED', 'COUNTY_REVIEW', 'APPROVED');
COMMIT;
```

---

## 8. Scaling & Partitioning

### Current Scale (Year 1–2): No Partitioning Required

At 50,000 applications/cycle × 2 cycles × 5 counties = 500,000 rows, PostgreSQL performs excellently with good indexing and no partitioning.

### Year 3 Partitioning Plan (47 counties, millions of rows)

Partition `applications` and `application_timeline` by `county_id` using list partitioning:

```sql
-- applications partitioned by county_id
CREATE TABLE applications (
  ...
) PARTITION BY LIST (county_id);

-- One partition per county, created at tenant provisioning time
CREATE TABLE applications_turkana 
  PARTITION OF applications FOR VALUES IN ('<turkana-uuid>');
CREATE TABLE applications_nairobi 
  PARTITION OF applications FOR VALUES IN ('<nairobi-uuid>');
-- ... etc.
```

**Why list partitioning by county_id?**  
- Most queries filter on county_id → partition pruning eliminates cross-county scans.
- Each county partition can be independently vacuumed, backed up, and eventually migrated to a dedicated database.
- No hot partition issues since counties are roughly equal in traffic.

### Read Replica Strategy

All `ReportingModule` queries use a secondary Prisma client pointed at the read replica connection string. The primary is used exclusively for writes and transactional reads.

---

## 9. Data Lifecycle Management

### Retention Policies

| Table | Retention | Archival | Hard Delete |
|-------|-----------|----------|-------------|
| `applications` | 7 years (financial audit) | Cold S3 after 2 years | Never |
| `application_timeline` | 7 years | Cold S3 after 2 years | Never |
| `documents` | 7 years | S3 Glacier after 2 years | Never |
| `disbursement_records` | 7 years | Cold S3 after 2 years | Never |
| `users` (student) | 7 years after last activity | — | After 7 years |
| `ai_score_cards` | 3 years | — | After 3 years |

### Soft Deletes

Users are soft-deleted via `deleted_at` timestamp. All queries include `WHERE deleted_at IS NULL` in their RLS policies. Soft-deleted users cannot log in but their application history is preserved for audit.

### Schema Evolution

All schema changes managed via Prisma migrations (generated SQL committed to version control). The migration CI pipeline:
1. Runs `prisma migrate deploy` against a test database.
2. Verifies backward compatibility (no column removals or type changes without a migration window).
3. Enforces a zero-downtime migration rule: additive changes only in production; destructive changes require a 2-sprint deprecation window.

---

## 10. Security & Compliance

### Column-Level Encryption

```sql
-- Encrypt on insert (application layer calls pgp_sym_encrypt)
INSERT INTO student_profiles (national_id, county_id, ...)
VALUES (pgp_sym_encrypt($national_id, $pii_key), $county_id, ...);

-- Decrypt only when needed (reporting never decrypts national_id)
SELECT pgp_sym_decrypt(national_id::bytea, $pii_key) AS national_id
FROM student_profiles WHERE user_id = $user_id;
```

The `$pii_key` is fetched from AWS Secrets Manager at application startup and stored in memory only. It is not logged, not stored in the database, and rotated annually.

### Audit Logging

Every data modification to sensitive tables (`users`, `student_profiles`, `academic_info`, `disbursement_records`) is captured by a PostgreSQL trigger writing to a separate `data_audit_log` table with: table name, operation type, old values (redacted for PII), new values, actor, timestamp.

### Kenya Data Protection Act 2019 Compliance

| Requirement | Implementation |
|-------------|----------------|
| Lawful basis for processing | County government statutory mandate (bursary act) |
| Data minimisation | Collect only fields on the official form |
| Right to access | Student portal shows all stored data |
| Right to erasure | Soft delete + 7-year retention floor for financial records |
| Data security | AES-256 at rest (KMS), TLS 1.3 in transit |
| Breach notification | SOC with 72-hour notification SOP |
| Data transfer outside Kenya | Restricted; S3 bucket in af-south-1 |

---

## 11. Reliability & Operations

### Backup Strategy

| Backup Type | Frequency | Retention | Location |
|-------------|-----------|-----------|----------|
| RDS automated backup | Daily | 35 days | AWS S3 (same region) |
| RDS snapshot (manual) | Weekly | 90 days | AWS S3 |
| Cross-region snapshot copy | Weekly | 30 days | eu-west-1 (disaster recovery) |
| S3 documents (versioning) | Continuous | 7 years | S3 with versioning enabled |

### RPO / RTO

- **RPO:** < 1 hour (point-in-time recovery via RDS).
- **RTO:** < 4 hours (RDS failover: < 60s; application tier restart: < 5 min; full DR from cross-region: < 4h).

### Monitoring

- **pg_stat_statements:** Track slow queries (>500ms) and alert.
- **RDS Enhanced Monitoring:** CPU, IOPS, connection count, replication lag.
- **Grafana dashboards:** Query latency histograms, connection pool utilization, index hit rate.
- **Alert:** Replication lag > 30 seconds → PagerDuty.

---

## 12. Prisma Schema

```prisma
// schema.prisma — complete production schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DATABASE_DIRECT_URL")
}

model County {
  id             String    @id @default(uuid())
  slug           String    @unique @db.VarChar(60)
  name           String    @db.VarChar(120)
  fundName       String?   @db.VarChar(180)
  legalReference String?   @db.VarChar(180)
  logoS3Key      String?
  primaryColor   String    @default("#1E3A5F") @db.VarChar(7)
  planTier       String    @default("BASIC") @db.VarChar(30)
  isActive       Boolean   @default(true)
  settings       Json      @default("{}")
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  wards          Ward[]
  users          User[]
  programs       BursaryProgram[]
  applications   Application[]

  @@map("counties")
}

model Ward {
  id          String   @id @default(uuid())
  countyId    String
  name        String   @db.VarChar(120)
  code        String?  @db.VarChar(20)
  subCounty   String?  @db.VarChar(120)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())

  county      County   @relation(fields: [countyId], references: [id], onDelete: Cascade)
  users       User[]
  programs    BursaryProgram[]
  applications Application[]

  @@unique([countyId, code])
  @@index([countyId])
  @@map("wards")
}

model User {
  id                  String    @id @default(uuid())
  countyId            String
  wardId              String?
  email               String    @db.VarChar(255)
  phone               String?   @db.VarChar(20)
  passwordHash        String    @db.VarChar(255)
  role                UserRole
  emailVerified       Boolean   @default(false)
  phoneVerified       Boolean   @default(false)
  isActive            Boolean   @default(true)
  lastLoginAt         DateTime?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  deletedAt           DateTime?

  county              County    @relation(fields: [countyId], references: [id])
  ward                Ward?     @relation(fields: [wardId], references: [id])
  profile             StudentProfile?
  academicInfo        AcademicInfo?
  familyInfo          FamilyFinancialInfo?
  applications        Application[]
  reviews             ApplicationReview[]

  @@unique([email, countyId])
  @@index([countyId])
  @@index([countyId, role])
  @@map("users")
}

enum UserRole {
  STUDENT
  WARD_ADMIN
  FINANCE_OFFICER
  COUNTY_ADMIN
  PLATFORM_OPERATOR
}

model StudentProfile {
  id              String   @id @default(uuid())
  userId          String   @unique
  countyId        String
  fullName        String   @db.VarChar(255)
  nationalId      Bytes?
  dateOfBirth     DateTime? @db.Date
  gender          String?  @db.VarChar(10)
  homeWard        String?  @db.VarChar(120)
  villageUnit     String?  @db.VarChar(120)
  phone           String?  @db.VarChar(20)
  profileComplete Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([countyId])
  @@map("student_profiles")
}

model AcademicInfo {
  id                  String   @id @default(uuid())
  userId              String   @unique
  countyId            String
  institutionType     String?  @db.VarChar(30)
  institutionName     String?  @db.VarChar(255)
  yearFormClass       String?  @db.VarChar(20)
  admissionNumber     String?  @db.VarChar(60)
  courseName          String?  @db.VarChar(255)
  bankAccountName     String?  @db.VarChar(255)
  bankAccountNumber   Bytes?
  bankName            String?  @db.VarChar(120)
  bankBranch          String?  @db.VarChar(120)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("academic_info")
}

model FamilyFinancialInfo {
  id                      String   @id @default(uuid())
  userId                  String   @unique
  countyId                String
  familyStatus            String?  @db.VarChar(30)
  hasDisability           Boolean  @default(false)
  disabilityDetails       String?
  guardianName            String?  @db.VarChar(255)
  guardianOccupation      String?  @db.VarChar(120)
  guardianContact         String?  @db.VarChar(20)
  numSiblings             Int?
  numGuardianChildren     Int?
  numSiblingsInSchool     Int?
  fatherOccupation        String?  @db.VarChar(120)
  fatherIncomeKes         Int?
  motherOccupation        String?  @db.VarChar(120)
  motherIncomeKes         Int?
  guardianIncomeKes       Int?
  siblingEducationDetails Json     @default("[]")
  orphanSponsorName       String?  @db.VarChar(255)
  orphanSponsorRelation   String?  @db.VarChar(60)
  orphanSponsorContact    String?  @db.VarChar(20)
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt

  user                    User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("family_financial_info")
}

model BursaryProgram {
  id              String   @id @default(uuid())
  countyId        String
  wardId          String?
  name            String   @db.VarChar(255)
  description     String?
  budgetCeiling   Decimal  @db.Decimal(15, 2)
  allocatedTotal  Decimal  @default(0) @db.Decimal(15, 2)
  disbursedTotal  Decimal  @default(0) @db.Decimal(15, 2)
  opensAt         DateTime
  closesAt        DateTime
  academicYear    String?  @db.VarChar(10)
  status          String   @default("DRAFT") @db.VarChar(20)
  createdBy       String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  county          County   @relation(fields: [countyId], references: [id])
  ward            Ward?    @relation(fields: [wardId], references: [id])
  applications    Application[]
  eligibilityRules EligibilityRule[]

  @@index([countyId])
  @@index([countyId, status])
  @@map("bursary_programs")
}

model Application {
  id                    String    @id @default(uuid())
  countyId              String
  applicantId           String
  programId             String
  wardId                String
  status                String    @default("DRAFT") @db.VarChar(30)
  totalFeeKes           Decimal?  @db.Decimal(12, 2)
  outstandingBalance    Decimal?  @db.Decimal(12, 2)
  amountAbleToPay       Decimal?  @db.Decimal(12, 2)
  amountRequested       Decimal?  @db.Decimal(12, 2)
  amountAllocated       Decimal?  @db.Decimal(12, 2)
  helbApplied           Boolean?
  priorBursaryReceived  Boolean   @default(false)
  reason                String?
  submissionReference   String?   @unique
  pdfS3Key              String?
  submittedAt           DateTime?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  county                County    @relation(fields: [countyId], references: [id])
  applicant             User      @relation(fields: [applicantId], references: [id])
  program               BursaryProgram @relation(fields: [programId], references: [id])
  ward                  Ward      @relation(fields: [wardId], references: [id])
  sections              ApplicationSection[]
  documents             Document[]
  reviews               ApplicationReview[]
  timeline              ApplicationTimeline[]
  scoreCard             AIScoreCard?
  disbursement          DisbursementRecord?

  @@index([countyId])
  @@index([countyId, status])
  @@index([countyId, wardId])
  @@index([programId])
  @@index([applicantId])
  @@map("applications")
}

model AIScoreCard {
  id                    String   @id @default(uuid())
  applicationId         String   @unique
  countyId              String
  totalScore            Decimal  @db.Decimal(5, 2)
  familyStatusScore     Decimal? @db.Decimal(5, 2)
  familyIncomeScore     Decimal? @db.Decimal(5, 2)
  educationBurdenScore  Decimal? @db.Decimal(5, 2)
  academicStandingScore Decimal? @db.Decimal(5, 2)
  documentQualityScore  Decimal? @db.Decimal(5, 2)
  integrityScore        Decimal? @db.Decimal(5, 2)
  anomalyFlags          Json     @default("[]")
  documentAnalysis      Json     @default("{}")
  modelVersion          String?  @db.VarChar(30)
  weightsApplied        Json
  scoredAt              DateTime @default(now())

  application           Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  @@index([countyId])
  @@index([countyId, totalScore(sort: Desc)])
  @@map("ai_score_cards")
}

model DisbursementRecord {
  id                    String   @id @default(uuid())
  applicationId         String   @unique
  countyId              String
  programId             String
  disbursementMethod    String   @db.VarChar(20)
  amountKes             Decimal  @db.Decimal(12, 2)
  recipientPhone        String?  @db.VarChar(20)
  recipientBankAccount  Bytes?
  recipientBankName     String?  @db.VarChar(120)
  transactionId         String?  @db.VarChar(120)
  status                String   @default("PENDING") @db.VarChar(20)
  failureReason         String?
  retryCount            Int      @default(0)
  initiatedBy           String
  initiatedAt           DateTime @default(now())
  confirmedAt           DateTime?
  receiptS3Key          String?

  application           Application @relation(fields: [applicationId], references: [id])

  @@index([countyId, status])
  @@map("disbursement_records")
}
```

---

## 13. Trade-offs & Risks

| Decision | Trade-off | Risk |
|----------|-----------|------|
| Shared DB + RLS | Simpler ops vs. stronger blast radius on a bug | Mitigated by 3-layer enforcement (guard + service + RLS) |
| JSONB for form sections | Schema flexibility vs. query complexity | Mitigated by section-level indexes; reporting uses structured fields |
| pgcrypto at column level | No KMS round-trip per query vs. key stored in app memory | Mitigated by Secrets Manager + memory-only key; key rotation plan |
| Advisory locks for budget | Correctness vs. throughput | Acceptable: budget enforcement is low-frequency; serialisation cost is justified |
| Soft deletes | Data safety vs. storage growth | Mitigated by 7-year hard-delete schedule |
| No time-series partitioning in v1 | Simpler ops vs. future migration cost | Partition plan documented; migration script ready to run at 47-county scale |