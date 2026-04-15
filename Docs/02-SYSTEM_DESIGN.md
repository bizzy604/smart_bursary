# KauntyBursary — System Design Document
**Version:** 1.0.0  
**Status:** Production-Ready Draft  
**References:** PRD v1.0.0, API Spec v1.0.0, Database Architecture v1.0.0

---

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Capacity Estimation](#2-capacity-estimation)
3. [High-Level Architecture](#3-high-level-architecture)
4. [Multi-Tenancy Strategy](#4-multi-tenancy-strategy)
5. [Service Breakdown](#5-service-breakdown)
6. [AI Scoring Engine Design](#6-ai-scoring-engine-design)
7. [Form & PDF Generation Pipeline](#7-form--pdf-generation-pipeline)
8. [Async Architecture](#8-async-architecture)
9. [Scalability Strategy](#9-scalability-strategy)
10. [Reliability & Fault Tolerance](#10-reliability--fault-tolerance)
11. [Security Architecture](#11-security-architecture)
12. [Observability & Operations](#12-observability--operations)
13. [Deployment Architecture](#13-deployment-architecture)
14. [Trade-Off Summary](#14-trade-off-summary)

---

## 1. System Overview

KauntyBursary is a multi-tenant SaaS platform composed of a Next.js 14 frontend (App Router), a NestJS modular backend, PostgreSQL as the primary data store with Row-Level Security, Redis for caching and job queuing, and AWS S3 for document storage.

### Architectural Philosophy

We adopt a **modular monolith** for the backend — one NestJS application with clearly bounded modules that can be extracted into independent services at a future scale inflection point. This avoids distributed systems complexity (service discovery, distributed tracing, inter-service auth) at a stage where operational simplicity matters more than independent deployability.

The exception is the **AI Scoring Engine**, which runs as a separate Python FastAPI microservice. This is justified because: (a) the Python ML ecosystem (Anthropic Claude API, scikit-learn for preprocessing) is superior to Node.js for this workload; (b) the scoring job is async and queue-driven, so it has no synchronous coupling with the main application; (c) independent scaling is needed — scoring jobs are CPU/IO intensive and should not share resources with the web API tier.

### Runtime Summary

```
Browser / Mobile Browser
        │
        ▼
   CloudFront CDN (static assets)
        │
        ▼
   Next.js 14 (App Router)          ← Vercel or ECS container
        │  API Routes (BFF layer)
        ▼
   NestJS Monolith (REST API)       ← ECS / EKS pods
        │
        ├─── PostgreSQL (RDS Multi-AZ)
        ├─── Redis (ElastiCache Cluster)
        ├─── AWS S3 (Document storage)
        ├─── BullMQ Workers (async jobs)
        │         │
        │         ▼
        │    AI Scoring Service (FastAPI/Python) ← separate container
        │
        └─── External: M-Pesa, Africa's Talking, SendGrid, NEMIS
```

---

## 2. Capacity Estimation

### Scale Assumptions

| Parameter | Value | Reasoning |
|-----------|-------|-----------|
| Counties (Year 1) | 5 | Conservative pilot target |
| Counties (Year 3) | 47 | Full national rollout |
| Students per county per cycle | 20,000–80,000 | County population variance |
| Intake cycle duration | 4–6 weeks | Based on Turkana County pattern |
| Applications per day at peak | ~15,000 | (75,000 avg students × 5 counties) / 25 days |
| Peak concurrent write QPS | 200–500 | Spike at intake opening (first 3 days) |
| Read : Write ratio | 15:1 | Dashboards, status checks, document views |
| Average document upload size | 500 KB | Mix of PDFs and photos |
| Document storage growth per cycle | ~7.5 GB | 15,000 apps × 3 docs × 500 KB × 5 counties |
| AI scoring jobs per day (peak) | 15,000 | 1:1 with applications |
| SMS notifications per day (peak) | 45,000 | ~3 per application lifecycle |

### Storage Estimates

| Store | Year 1 | Year 3 |
|-------|--------|--------|
| PostgreSQL (all tables) | ~50 GB | ~400 GB |
| S3 documents | ~45 GB/cycle × 2 cycles = 90 GB | ~900 GB |
| Redis | < 5 GB | < 20 GB |

### Bandwidth

- Inbound (uploads): 15,000 docs/day × 500 KB = ~7.5 GB/day at peak.
- Outbound (downloads, dashboards): ~15× read ratio = ~112 GB/day reads at peak (mostly served from CDN/read replica).

---

## 3. High-Level Architecture

### 3.1 Client Layer

Three distinct web portals, all served from a single Next.js application with role-based routing:

- **Student Portal** (`/portal`) — mobile-first, multi-step application wizard, status tracking.
- **Admin Portal** (`/admin`) — ward admin, county admin, finance officer dashboards.
- **Platform Ops Dashboard** (`/ops`) — internal SaaS team tooling.

### 3.2 API Layer

All external calls go through the NestJS REST API versioned at `/api/v1`. The Next.js App Router acts as a Backend-for-Frontend (BFF) layer for the student portal, aggregating API calls server-side and passing only shaped data to client components. This reduces round trips and hides internal API structure.

### 3.3 Data Flow for a Typical Application Submission

```
Student fills form (client component, React state)
    → Step-by-step validation (Zod schemas, client side)
        → Section save (PATCH /api/v1/applications/:id/sections/:section)
            → Final submit (POST /api/v1/applications/:id/submit)
                → DB write: application status → SUBMITTED
                → S3: documents confirmed (presigned upload already done)
                → BullMQ: enqueue AI scoring job
                → BullMQ: enqueue SMS notification job
                → Response: 201 Created with application summary
                    → Client renders success + PDF download link
```

### 3.4 AI Scoring Data Flow

```
BullMQ job: { applicationId, countyId }
    → AI Scoring Service (FastAPI)
        → Fetch application data from NestJS internal API
        → Run scoring pipeline:
            1. Structured data scoring (rules-based on form fields)
            2. Document quality assessment (Claude vision API)
            3. Anomaly detection (cross-application duplicate check)
            4. Composite score calculation (weighted sum)
        → Write AIScoreCard to DB via NestJS internal API
        → BullMQ: enqueue notification to ward admin
```

---

## 4. Multi-Tenancy Strategy

### Strategy: Shared Database, Schema-Level Isolation with RLS

Every table in the application domain carries a `county_id` UUID column. PostgreSQL Row-Level Security policies ensure that every database session can only read and write rows matching the session's `county_id`.

**Why not separate databases per county?**  
Separate databases would simplify isolation guarantees but create an operational nightmare: 47 separate RDS instances, 47 separate migration runs, 47 backup policies. At Kenya's county size, shared-database RLS is the correct trade-off. We revisit at 100+ tenants or if a county requires contractual data residency isolation (not currently required by Kenyan law).

### RLS Implementation

```sql
-- Set at connection acquisition time by the NestJS DB service
SET app.current_county_id = '<county_uuid>';
SET app.current_role = '<user_role>';
SET app.current_ward_id = '<ward_uuid_or_null>';

-- Policy: students see only their own applications
CREATE POLICY student_own_apps ON applications
  FOR ALL
  TO application_role
  USING (
    county_id = current_setting('app.current_county_id')::uuid
    AND (
      current_setting('app.current_role') != 'STUDENT'
      OR applicant_id = current_setting('app.current_user_id')::uuid
    )
  );

-- Policy: ward admins see only their ward
CREATE POLICY ward_admin_scope ON applications
  FOR SELECT
  TO application_role
  USING (
    county_id = current_setting('app.current_county_id')::uuid
    AND (
      current_setting('app.current_role') IN ('COUNTY_ADMIN', 'FINANCE_OFFICER', 'PLATFORM_OPERATOR')
      OR ward_id = current_setting('app.current_ward_id')::uuid
    )
  );
```

### Tenant Context Injection

The NestJS `DatabaseModule` wraps every request in a Prisma `$transaction` that first executes the `SET` statements from the JWT claims before any query runs:

```typescript
async withTenantContext<T>(
  countyId: string,
  userId: string,
  role: UserRole,
  wardId: string | null,
  fn: (prisma: PrismaClient) => Promise<T>
): Promise<T> {
  return this.prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL app.current_county_id = ${countyId}`;
    await tx.$executeRaw`SET LOCAL app.current_role = ${role}`;
    await tx.$executeRaw`SET LOCAL app.current_user_id = ${userId}`;
    await tx.$executeRaw`SET LOCAL app.current_ward_id = ${wardId ?? ''}`;
    return fn(tx);
  });
}
```

---

## 5. Service Breakdown

### 5.1 NestJS Modules (Modular Monolith)

| Module | Responsibility | Key Dependencies |
|--------|---------------|------------------|
| `AuthModule` | JWT issuance/validation, refresh token rotation, OTP | Redis (token blocklist), Africa's Talking |
| `TenantModule` | County provisioning, branding config, plan management | S3 (logo storage) |
| `UserModule` | User CRUD, role management, ward assignment | — |
| `ProfileModule` | StudentProfile, AcademicInfo, FamilyFinancialInfo | — |
| `ProgramModule` | BursaryProgram CRUD, eligibility rule evaluation | — |
| `ApplicationModule` | Full application lifecycle, section saves, submission | S3, BullMQ, ProgramModule |
| `DocumentModule` | Presigned URL generation, scan status management | S3, ClamAV sidecar |
| `ReviewModule` | Ward + county review workflows, allocation locking | ProgramModule (budget) |
| `DisbursementModule` | M-Pesa B2C, EFT export, receipt generation | M-Pesa Daraja, react-pdf |
| `NotificationModule` | SMS, email dispatch (consumes BullMQ events) | Africa's Talking, SendGrid |
| `ReportingModule` | OCOB reports, dashboard aggregates, CSV/Excel export | Read replica connection |
| `AIModule` | Score card retrieval, weight configuration | — (AI Scoring Service writes directly) |
| `AuditModule` | Immutable timeline writes, audit log queries | — |

### 5.2 AI Scoring Service (FastAPI / Python)

Runs as a separate Docker container. Communicates with the main NestJS service via internal HTTP (within the same VPC/network namespace in ECS/EKS).

**Endpoints (internal only, not exposed via API gateway):**

```
POST /score          — triggers scoring for an application
GET  /score/:id      — retrieves score card (for NestJS to proxy)
POST /weights/validate — validates county weight configuration
GET  /health         — health check
```

**Scoring Pipeline:**

1. **Data fetch:** Pull structured application data from NestJS internal API.
2. **Rule-based scoring:** Apply weighted scoring to structured fields:
   - Family status (orphan = 25 pts, single parent = 15 pts, both parents alive = 5 pts)
   - Family income bracket (< 10K/month = 20 pts, 10–30K = 12 pts, 30K+ = 4 pts)
   - Number of dependants in school (each = 5 pts, max 20 pts)
   - Disability status — student or parent (10 pts)
   - Prior bursary receipt in last 3 months (−15 pts)
   - HELB application status for university students (verified = 5 pts bonus)
3. **Document quality scoring:** Use Claude claude-sonnet-4-20250514 vision API to assess document clarity, completeness, and authenticity flags. Adds up to 10 pts.
4. **Anomaly detection:**
   - Cross-check national_id against existing applications in the same cycle.
   - Income declaration consistency check (stated income vs. occupation plausibility).
   - Document metadata analysis (creation date, modification date vs. upload date).
5. **Composite score:** Weighted sum of all dimensions, normalised to 0–100.
6. **Score card write:** POST to NestJS internal `/internal/ai-scores` with full breakdown.

---

## 6. AI Scoring Engine Design

### 6.1 Scoring Dimensions and Default Weights

```json
{
  "dimensions": {
    "family_status": {
      "weight": 0.25,
      "max_raw_score": 25,
      "description": "Orphan, single parent, disability status"
    },
    "family_income": {
      "weight": 0.25,
      "max_raw_score": 25,
      "description": "Annual household income in KES"
    },
    "education_burden": {
      "weight": 0.20,
      "max_raw_score": 20,
      "description": "Number of dependants in education simultaneously"
    },
    "academic_standing": {
      "weight": 0.15,
      "max_raw_score": 15,
      "description": "Year of study, institution type, performance (from document)"
    },
    "document_quality": {
      "weight": 0.10,
      "max_raw_score": 10,
      "description": "Completeness and clarity of uploaded documents"
    },
    "integrity_flags": {
      "weight": 0.05,
      "max_raw_score": 5,
      "description": "Deductions for anomalies and prior bursary receipt"
    }
  }
}
```

### 6.2 Claude Vision Integration (Document Analysis)

```python
async def analyse_document(s3_url: str, doc_type: str) -> DocumentScore:
    """
    Download document from S3 presigned URL, send to Claude claude-sonnet-4-20250514 vision,
    return a structured quality assessment.
    """
    image_data = await download_document(s3_url)
    
    response = await anthropic_client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=500,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", 
                 "media_type": "image/jpeg", "data": image_data}},
                {"type": "text", "text": f"""
                    Analyse this {doc_type} document for a Kenyan county bursary application.
                    Return a JSON object with:
                    - is_legible: boolean
                    - appears_authentic: boolean  
                    - matches_declared_institution: boolean (if detectable)
                    - quality_score: 0-10
                    - flags: list of concern strings
                    Return only valid JSON.
                """}
            ]
        }]
    )
    return DocumentScore.parse_raw(response.content[0].text)
```

### 6.3 County-Configurable Weights

County Super Admins can adjust dimension weights within guardrails:
- No single dimension may exceed 40% weight.
- Total weights must sum to 1.0.
- Changes are logged and take effect only for the next intake cycle (not retroactively).

---

## 7. Form & PDF Generation Pipeline

### 7.1 Multi-Step Application Wizard

The form is a stateful multi-step wizard using React state + server-side section persistence. Each section is saved independently (PATCH), so partial progress is preserved.

**Section architecture:**

```
ApplicationWizard (client component)
├── SectionA — Personal Details (pre-filled from StudentProfile)
├── SectionB — Amounts Applied (fee amounts, outstanding balance, bank details)
├── SectionC — Family Details (family status, guardian info, sibling table)
├── SectionD — Financial Status (income grid: father/mother/guardian)
├── SectionE — Other Disclosures (prior bursary, HELB, reasons)
├── SectionF — Document Upload (presigned S3 upload per document type)
└── SectionG — Preview & Submit
     ├── PDF Preview (rendered by react-pdf in browser)
     └── Submit button → POST /api/v1/applications/:id/submit
```

### 7.2 PDF Generation

PDF generation uses **@react-pdf/renderer** on both client (preview) and server (final download/archive).

The PDF template:
- Mirrors the official gazetted form layout (Turkana County Education Fund Second Schedule No. 4, 2023 structure).
- Injects county logo (fetched from S3 by county slug).
- Populates all fields with student data.
- Renders the sibling education table as a real table.
- Includes the declaration section with submission timestamp.
- Renders a QR code containing the application reference number for verification.

**Template customisation per county:**
- Logo: county logo from S3.
- Primary colour: used for section headers and borders.
- County name: replaces "Turkana County".
- Fund name: e.g. "Turkana County Education Fund" → "[CountyName] Bursary Fund".
- Fund legal reference: configurable per county's gazette act.

### 7.3 Server-Side PDF Archive

Upon final submission, a server-side PDF render job is enqueued. This generates the canonical PDF (identical to student preview) and stores it in S3 at `s3://[bucket]/counties/[county-id]/applications/[app-id]/application-form.pdf`. This is the legally archived copy.

---

## 8. Async Architecture

### 8.1 Queue Design (BullMQ + Redis)

| Queue | Producer | Consumer | Priority | Retry |
|-------|---------|---------|---------|-------|
| `ai-scoring` | ApplicationModule (on submit) | AI Scoring Worker | Normal | 3× with exponential backoff |
| `document-scan` | DocumentModule (on upload confirm) | Document Scan Worker | High | 3× |
| `pdf-archive` | ApplicationModule (on submit) | PDF Worker | Low | 2× |
| `sms-dispatch` | NotificationModule | SMS Worker | High | 5× |
| `email-dispatch` | NotificationModule | Email Worker | Normal | 3× |
| `disbursement` | DisbursementModule | Disbursement Worker | Critical | Manual retry only |
| `report-export` | ReportingModule | Report Worker | Low | 1× |

### 8.2 Idempotency

All queue jobs carry an `idempotencyKey` derived from `${jobType}:${entityId}`. BullMQ's deduplication window is set to 5 minutes, preventing double-processing on retry.

### 8.3 Dead Letter Queue

Jobs that exhaust retries are moved to a `dlq` queue. A Slack alert is triggered. Platform operators can inspect and replay from the ops dashboard.

---

## 9. Scalability Strategy

### 9.1 Horizontal Scaling

| Component | Scaling Strategy |
|-----------|-----------------|
| NestJS API | HPA on CPU/memory, 2–10 replicas |
| AI Scoring Service | HPA on queue depth, 1–5 replicas |
| BullMQ Workers | HPA on queue depth, 1–8 workers per queue |
| Next.js (if self-hosted) | HPA on CPU, 2–6 replicas |
| PostgreSQL | Vertical scale primary; read replica for reads |
| Redis | ElastiCache cluster mode |

### 9.2 Caching Strategy

| Cache Layer | What is Cached | TTL | Invalidation |
|-------------|---------------|-----|--------------|
| Redis | Program eligibility rules | 5 min | On program update |
| Redis | County branding config | 30 min | On settings save |
| Redis | Dashboard aggregate counts | 30 sec | Time-based expiry |
| Redis | Rate limit counters | 1 min sliding | — |
| CDN | Static assets, county logos | 7 days | Cache-bust on upload |
| PostgreSQL | Query plan cache | Automatic | — |

### 9.3 Database Read/Write Split

Reporting queries (OCOB reports, dashboard aggregates) are routed to the read replica. All transactional writes go to the primary. Prisma's `$replica()` extension handles routing.

---

## 10. Reliability & Fault Tolerance

### 10.1 Circuit Breakers

External service calls (M-Pesa, Africa's Talking, Claude API) are wrapped in circuit breakers (using `opossum` for Node.js). States: CLOSED → OPEN (after 5 failures in 10s) → HALF_OPEN (probe after 30s).

### 10.2 Graceful Degradation

| Failure | Degradation Mode |
|---------|-----------------|
| AI Scoring Service down | Application submits; AI score shown as "Pending" to committee. No blocking. |
| SMS gateway down | Email fallback; SMS retried from DLQ when gateway recovers. |
| M-Pesa API down | EFT export available as fallback; Finance Officer alerted. |
| Redis down | Rate limiting disabled (accept all traffic); session auth falls back to stateless JWT validation only. |
| S3 down | Document uploads blocked; application section saves continue; retry when S3 recovers. |

### 10.3 Database Failover

RDS Multi-AZ: automatic failover to standby in < 60 seconds. NestJS Prisma connection pool automatically reconnects. No code changes required.

### 10.4 Health Checks

```
GET /health/live   — liveness probe (returns 200 if process running)
GET /health/ready  — readiness probe (checks DB, Redis, queue connections)
GET /health/deps   — dependency status (M-Pesa, SMS, S3 reachability)
```

---

## 11. Security Architecture

### 11.1 Authentication Flow

```
Login request → NestJS AuthModule
    → Verify password (bcrypt, 12 rounds)
    → Issue access_token (JWT, 15 min, RS256)
    → Issue refresh_token (opaque, 7 days, stored in Redis)
    → Set refresh_token as HttpOnly Secure SameSite=Strict cookie
    → Return access_token in response body
```

### 11.2 Authorization Layers

Three independent enforcement layers:
1. **API Gateway guard** (NestJS `@Roles()` decorator + JWT validation).
2. **Service layer check** (explicit ownership checks in service methods).
3. **Database layer RLS** (final enforcement; prevents any service bug from leaking data).

### 11.3 Document Security

- Documents are uploaded directly to S3 via presigned URLs (never through the API server).
- Post-upload, a server-side job verifies the upload and triggers ClamAV scan.
- Documents are served via presigned download URLs (15-minute expiry), never via public URLs.
- All S3 buckets are private; no public access policy.

### 11.4 PII Encryption

```sql
-- national_id encrypted at rest using pgcrypto + AWS KMS key
INSERT INTO student_profiles (national_id, ...) 
VALUES (pgp_sym_encrypt($1, current_setting('app.pii_key')), ...);

-- Decrypted only in application layer, never in reporting queries
SELECT pgp_sym_decrypt(national_id::bytea, current_setting('app.pii_key')) 
FROM student_profiles WHERE id = $1;
```

### 11.5 Rate Limiting

| Endpoint Category | Limit |
|-------------------|-------|
| Auth (login/register) | 10 req/min per IP |
| Application submit | 5 req/min per user |
| Document upload | 20 req/min per user |
| API read endpoints | 200 req/min per user |
| Report export | 5 req/min per user |
| AI score retrieval | 60 req/min per ward admin |

---

## 12. Observability & Operations

### 12.1 Structured Logging

All logs are JSON-structured with fields: `timestamp`, `level`, `service`, `traceId`, `spanId`, `countyId`, `userId`, `method`, `path`, `statusCode`, `durationMs`.

Log levels: ERROR (alert), WARN (monitor), INFO (default), DEBUG (dev only).

### 12.2 Metrics (Prometheus + Grafana)

Key metrics:
- `http_request_duration_seconds` — P50/P95/P99 per endpoint.
- `application_submissions_total` — counter by county.
- `ai_scoring_job_duration_seconds` — scoring latency.
- `disbursement_success_total` / `disbursement_failure_total`.
- `queue_depth` per BullMQ queue.
- `budget_utilization_percentage` per program.

### 12.3 Alerting (PagerDuty / Slack)

| Alert | Threshold | Channel |
|-------|-----------|---------|
| API error rate | > 2% over 5 min | PagerDuty (P1) |
| Queue depth (AI scoring) | > 1,000 jobs | Slack (warning) |
| Disbursement failure | Any failure | PagerDuty (P1) |
| DB connection pool exhaustion | > 90% | PagerDuty (P2) |
| AI Scoring Service down | Health check fail > 2 min | PagerDuty (P2) |

### 12.4 Distributed Tracing

OpenTelemetry SDK instrumented in both NestJS and FastAPI services. Traces exported to Jaeger or AWS X-Ray. Every request carries a `X-Trace-Id` header propagated through service calls, queue jobs, and external API calls.

---

## 13. Deployment Architecture

### 13.1 Infrastructure (Terraform-managed on AWS)

```
VPC (10.0.0.0/16)
├── Public Subnets (2 AZs)
│   ├── Application Load Balancer
│   └── NAT Gateway
├── Private Subnets (2 AZs)
│   ├── ECS/EKS cluster (NestJS, AI Service, Workers)
│   ├── Next.js containers (or Vercel for simplicity)
│   ├── RDS PostgreSQL (Multi-AZ, private)
│   └── ElastiCache Redis (private)
└── CloudFront distribution → S3 (static assets)
```

### 13.2 CI/CD Pipeline (GitHub Actions)

```
Push to main
    → Unit tests (Jest, pytest)
    → Integration tests (Testcontainers: PostgreSQL, Redis)
    → Security scan (Snyk, OWASP dependency check)
    → Docker build + push to ECR
    → Terraform plan (requires approval for infra changes)
    → Deploy to staging (auto)
    → E2E tests (Playwright)
    → Deploy to production (manual approval)
    → Post-deploy smoke test
    → Notify Slack
```

### 13.3 Docker Compose (Local Development)

```yaml
version: '3.9'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: kaunty_dev
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  nestjs:
    build: ./apps/api
    environment:
      DATABASE_URL: postgresql://dev:dev@postgres:5432/kaunty_dev
      REDIS_URL: redis://redis:6379
    ports: ["3001:3001"]
    depends_on: [postgres, redis]

  ai-service:
    build: ./apps/ai-scoring
    environment:
      NESTJS_INTERNAL_URL: http://nestjs:3001
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
    ports: ["8000:8000"]
    depends_on: [nestjs]

  nextjs:
    build: ./apps/web
    environment:
      NEXT_PUBLIC_API_URL: http://nestjs:3001
    ports: ["3000:3000"]
    depends_on: [nestjs]

volumes:
  pgdata:
```

---

## 14. Trade-Off Summary

| Decision | Choice | Alternative Rejected | Why |
|----------|--------|---------------------|-----|
| Backend architecture | Modular monolith | Full microservices | Premature complexity; 5-county pilot doesn't justify distributed systems overhead |
| Multi-tenancy | Shared DB + RLS | Separate DB per county | 47 DBs = 47× operational cost; RLS is proven for this scale |
| AI engine language | Python FastAPI | Node.js | Python ML ecosystem superiority; async decoupling via queue removes sync coupling risk |
| PDF generation | @react-pdf/renderer | Puppeteer/headless Chrome | react-pdf is lighter, no Chrome dependency in container, easier to template |
| Auth tokens | JWT + HttpOnly refresh cookie | Server-side sessions | Stateless JWT enables horizontal scaling; HttpOnly cookie protects against XSS on refresh token |
| Budget enforcement | DB advisory locks | Optimistic concurrency | Government financial context requires zero over-allocation; we accept serialisation cost |
| S3 uploads | Presigned URLs | Proxy through API | Eliminates bandwidth bottleneck and file size limits at the API tier |