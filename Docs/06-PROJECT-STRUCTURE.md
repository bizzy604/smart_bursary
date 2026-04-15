# KauntyBursary — Modular Project Structure
**Version:** 1.0.0  
**Stack:** Next.js 14 (App Router) + NestJS + FastAPI (AI) + Docker

---

## Monorepo Overview

```
kaunty-bursary/
├── apps/
│   ├── web/                          # Next.js 14 — Student & Admin Portals
│   ├── api/                          # NestJS — Main Backend API
│   └── ai-scoring/                   # FastAPI (Python) — AI Scoring Microservice
├── packages/
│   ├── shared-types/                 # TypeScript types shared across web + api
│   ├── ui/                           # Shared React component library
│   └── pdf-templates/                # @react-pdf/renderer form templates
├── infra/
│   ├── terraform/                    # AWS infrastructure (IaC)
│   ├── docker/                       # Docker configs
│   └── k8s/                          # Kubernetes manifests
├── docs/
│   ├── 01-PRD.md
│   ├── 02-SYSTEM-DESIGN.md
│   ├── 03-DATABASE-ARCHITECTURE.md
│   ├── 04-API-DESIGN.md
│   └── 05-UI-UX-DESIGN-SYSTEM.md
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Test + lint on PR
│       ├── deploy-staging.yml        # Auto deploy to staging on main merge
│       └── deploy-production.yml     # Manual approval required
├── docker-compose.yml               # Local development
├── docker-compose.test.yml          # Integration test environment
├── .env.example
├── turbo.json                        # Turborepo pipeline config
└── package.json                      # Root workspace config
```

---

## apps/web — Next.js 14 (App Router)

```
apps/web/
├── src/
│   ├── app/                                    # Next.js App Router
│   │   │
│   │   ├── (auth)/                             # Auth routes (no layout chrome)
│   │   │   ├── login/
│   │   │   │   └── page.tsx                    # Login screen
│   │   │   ├── register/
│   │   │   │   └── page.tsx                    # Registration
│   │   │   ├── verify-email/
│   │   │   │   └── page.tsx                    # Email verification
│   │   │   ├── verify-phone/
│   │   │   │   └── page.tsx                    # OTP screen
│   │   │   ├── forgot-password/
│   │   │   │   └── page.tsx
│   │   │   └── reset-password/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (student)/                          # Student portal (student layout)
│   │   │   ├── layout.tsx                      # Student shell (header + mobile nav)
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx                    # Student dashboard
│   │   │   ├── programs/
│   │   │   │   ├── page.tsx                    # Eligible programs list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx                # Program detail
│   │   │   ├── apply/
│   │   │   │   └── [programId]/
│   │   │   │       ├── layout.tsx              # Wizard layout (progress + steps)
│   │   │   │       ├── page.tsx                # Redirect to step 1
│   │   │   │       ├── section-a/
│   │   │   │       │   └── page.tsx            # Personal details (pre-filled)
│   │   │   │       ├── section-b/
│   │   │   │       │   └── page.tsx            # Amounts applied
│   │   │   │       ├── section-c/
│   │   │   │       │   └── page.tsx            # Family details
│   │   │   │       ├── section-d/
│   │   │   │       │   └── page.tsx            # Financial status
│   │   │   │       ├── section-e/
│   │   │   │       │   └── page.tsx            # Other disclosures
│   │   │   │       ├── section-f/
│   │   │   │       │   └── page.tsx            # Document upload
│   │   │   │       └── preview/
│   │   │   │           └── page.tsx            # PDF preview + submit
│   │   │   ├── applications/
│   │   │   │   ├── page.tsx                    # My applications list
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx                # Application detail + timeline
│   │   │   │       └── pdf/
│   │   │   │           └── route.ts            # PDF download API route
│   │   │   └── profile/
│   │   │       ├── page.tsx                    # Profile overview
│   │   │       ├── personal/
│   │   │       │   └── page.tsx                # Edit personal details
│   │   │       ├── academic/
│   │   │       │   └── page.tsx                # Edit academic info
│   │   │       └── family/
│   │   │           └── page.tsx                # Edit family/financial info
│   │   │
│   │   ├── (admin)/                            # Admin portal (sidebar layout)
│   │   │   ├── layout.tsx                      # Admin shell (sidebar + header)
│   │   │   │
│   │   │   ├── ward/                           # Ward Admin pages
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── applications/
│   │   │   │   │   ├── page.tsx                # Application list ranked by AI score
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── page.tsx            # Full application review
│   │   │   │   │       ├── documents/
│   │   │   │   │       │   └── page.tsx        # Document viewer
│   │   │   │   │       └── score/
│   │   │   │   │           └── page.tsx        # AI score card
│   │   │   │   └── reports/
│   │   │   │       └── page.tsx                # Ward report export
│   │   │   │
│   │   │   ├── county/                         # Finance Officer pages
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── page.tsx                # County-wide dashboard
│   │   │   │   ├── review/
│   │   │   │   │   ├── page.tsx                # County review queue
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx            # Final approval/rejection
│   │   │   │   ├── disbursements/
│   │   │   │   │   ├── page.tsx                # Disbursement queue
│   │   │   │   │   └── batch/
│   │   │   │   │       └── page.tsx            # EFT batch export
│   │   │   │   └── reports/
│   │   │   │       ├── page.tsx                # Report selection
│   │   │   │       └── ocob/
│   │   │   │           └── page.tsx            # OCOB report generation
│   │   │   │
│   │   │   └── settings/                       # County Admin pages
│   │   │       ├── page.tsx                    # Settings overview
│   │   │       ├── branding/
│   │   │       │   └── page.tsx                # Logo, colour, county name
│   │   │       ├── programs/
│   │   │       │   ├── page.tsx                # Program list
│   │   │       │   ├── new/
│   │   │       │   │   └── page.tsx            # Create program
│   │   │       │   └── [id]/
│   │   │       │       └── page.tsx            # Edit program
│   │   │       ├── wards/
│   │   │       │   └── page.tsx                # Ward management
│   │   │       ├── users/
│   │   │       │   ├── page.tsx                # Staff user list
│   │   │       │   └── new/
│   │   │       │       └── page.tsx            # Create staff user
│   │   │       └── ai-scoring/
│   │   │           └── page.tsx                # Scoring weights configuration
│   │   │
│   │   ├── (ops)/                              # Platform Operator pages
│   │   │   ├── layout.tsx
│   │   │   ├── tenants/
│   │   │   │   ├── page.tsx                    # County tenant list
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx                # Tenant detail + health
│   │   │   └── health/
│   │   │       └── page.tsx                    # System health dashboard
│   │   │
│   │   ├── api/                                # Next.js API Routes (BFF layer)
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/
│   │   │   │       └── route.ts
│   │   │   ├── applications/
│   │   │   │   └── [id]/
│   │   │   │       └── pdf/
│   │   │   │           └── route.ts            # PDF generation API route
│   │   │   └── health/
│   │   │       └── route.ts
│   │   │
│   │   ├── layout.tsx                          # Root layout (fonts, providers)
│   │   ├── not-found.tsx
│   │   └── error.tsx
│   │
│   ├── components/                             # Shared UI components
│   │   ├── ui/                                 # Primitive components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── radio-group.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── drawer.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── table.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── skeleton.tsx
│   │   │   └── spinner.tsx
│   │   │
│   │   ├── forms/                              # Form-specific components
│   │   │   ├── field-group.tsx                 # Grouped field container
│   │   │   ├── form-section.tsx                # Wizard step container
│   │   │   ├── sibling-table.tsx               # Dynamic sibling rows (Section C)
│   │   │   ├── income-grid.tsx                 # 3-column income input (Section D)
│   │   │   ├── document-upload.tsx             # Document upload + scan status
│   │   │   └── step-progress.tsx               # Wizard step indicator
│   │   │
│   │   ├── application/                        # Application-specific components
│   │   │   ├── application-card.tsx
│   │   │   ├── status-badge.tsx
│   │   │   ├── timeline.tsx
│   │   │   ├── ai-score-card.tsx
│   │   │   ├── document-viewer.tsx
│   │   │   ├── budget-bar.tsx
│   │   │   └── review-panel.tsx
│   │   │
│   │   ├── pdf/                                # PDF components
│   │   │   ├── bursary-form-pdf.tsx            # Main PDF template
│   │   │   ├── pdf-preview.tsx                 # In-browser PDF preview wrapper
│   │   │   └── pdf-sections/
│   │   │       ├── section-a.tsx
│   │   │       ├── section-b.tsx
│   │   │       ├── section-c.tsx
│   │   │       ├── section-d.tsx
│   │   │       ├── section-e.tsx
│   │   │       ├── section-f.tsx
│   │   │       └── section-g.tsx
│   │   │
│   │   ├── layout/                             # Layout components
│   │   │   ├── student-header.tsx
│   │   │   ├── student-bottom-nav.tsx
│   │   │   ├── admin-sidebar.tsx
│   │   │   ├── admin-header.tsx
│   │   │   └── county-branding-provider.tsx    # Injects county CSS vars
│   │   │
│   │   └── shared/
│   │       ├── county-logo.tsx
│   │       ├── empty-state.tsx
│   │       ├── error-boundary.tsx
│   │       ├── language-switcher.tsx
│   │       └── stats-card.tsx
│   │
│   ├── lib/                                    # Utilities & config
│   │   ├── api-client.ts                       # Typed API client (wraps fetch)
│   │   ├── auth.ts                             # Auth helpers (token management)
│   │   ├── pdf.ts                              # PDF generation utilities
│   │   ├── validators.ts                       # Zod schemas (client-side)
│   │   ├── utils.ts                            # General utilities
│   │   ├── format.ts                           # Date, currency, reference formatters
│   │   └── constants.ts                        # App-wide constants
│   │
│   ├── hooks/                                  # Custom React hooks
│   │   ├── use-auth.ts
│   │   ├── use-application.ts
│   │   ├── use-county.ts
│   │   ├── use-document-scan.ts                # Polls scan status
│   │   ├── use-auto-save.ts                    # Debounced section save
│   │   └── use-pdf-preview.ts
│   │
│   ├── store/                                  # Zustand state stores
│   │   ├── auth-store.ts
│   │   ├── application-wizard-store.ts
│   │   └── county-store.ts
│   │
│   ├── i18n/
│   │   ├── messages/
│   │   │   ├── en.json
│   │   │   └── sw.json
│   │   └── config.ts
│   │
│   └── styles/
│       ├── globals.css                         # CSS custom properties + resets
│       └── pdf.css                             # PDF-specific styles
│
├── public/
│   ├── logos/                                  # Default county logo fallback
│   └── fonts/                                  # Self-hosted fonts
│
├── tailwind.config.ts
├── next.config.ts
├── tsconfig.json
├── .env.local.example
└── package.json
```

---

## apps/api — NestJS Backend

```
apps/api/
├── src/
│   ├── main.ts                                 # Bootstrap + Swagger setup
│   ├── app.module.ts                           # Root module
│   ├── app.controller.ts                       # Health check endpoints
│   │
│   ├── config/
│   │   ├── configuration.ts                    # env config factory
│   │   ├── validation.ts                       # env validation schema (Joi)
│   │   └── database.config.ts                  # Prisma + RLS setup
│   │
│   ├── common/                                 # Shared utilities
│   │   ├── decorators/
│   │   │   ├── roles.decorator.ts              # @Roles() decorator
│   │   │   ├── county.decorator.ts             # @County() — extracts county from JWT
│   │   │   └── current-user.decorator.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── roles.guard.ts
│   │   │   └── ward-scope.guard.ts             # Enforces ward-level access
│   │   ├── interceptors/
│   │   │   ├── response-transform.interceptor.ts  # Wraps responses in { data: ... }
│   │   │   ├── tenant-context.interceptor.ts   # Sets RLS session vars
│   │   │   └── logging.interceptor.ts
│   │   ├── filters/
│   │   │   ├── global-exception.filter.ts      # Standardized error responses
│   │   │   └── prisma-exception.filter.ts      # Maps Prisma errors to HTTP
│   │   ├── pipes/
│   │   │   ├── zod-validation.pipe.ts
│   │   │   └── parse-uuid.pipe.ts
│   │   └── dto/
│   │       ├── pagination.dto.ts
│   │       └── error-response.dto.ts
│   │
│   ├── database/
│   │   ├── database.module.ts
│   │   ├── prisma.service.ts                   # Prisma client + RLS helpers
│   │   └── migrations/                         # Prisma migration files
│   │
│   ├── redis/
│   │   ├── redis.module.ts
│   │   └── redis.service.ts
│   │
│   ├── queue/
│   │   ├── queue.module.ts                     # BullMQ module setup
│   │   ├── queue.service.ts                    # Job enqueue helpers
│   │   └── processors/
│   │       ├── ai-scoring.processor.ts         # Calls AI service
│   │       ├── document-scan.processor.ts      # ClamAV trigger
│   │       ├── pdf-archive.processor.ts        # Server-side PDF generation
│   │       ├── sms.processor.ts                # Africa's Talking dispatch
│   │       ├── email.processor.ts              # SendGrid dispatch
│   │       ├── disbursement.processor.ts       # M-Pesa B2C retry logic
│   │       └── report.processor.ts             # Async report generation
│   │
│   ├── modules/
│   │   │
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   └── refresh-token.strategy.ts
│   │   │   └── dto/
│   │   │       ├── register.dto.ts
│   │   │       ├── login.dto.ts
│   │   │       └── reset-password.dto.ts
│   │   │
│   │   ├── tenant/
│   │   │   ├── tenant.module.ts
│   │   │   ├── tenant.controller.ts            # /admin/settings
│   │   │   ├── tenant.service.ts
│   │   │   ├── provisioning.service.ts         # New county setup
│   │   │   └── dto/
│   │   │       └── update-settings.dto.ts
│   │   │
│   │   ├── user/
│   │   │   ├── user.module.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   └── dto/
│   │   │       ├── create-user.dto.ts
│   │   │       └── update-user.dto.ts
│   │   │
│   │   ├── profile/
│   │   │   ├── profile.module.ts
│   │   │   ├── profile.controller.ts           # /profile/*
│   │   │   ├── profile.service.ts
│   │   │   ├── academic-info.service.ts
│   │   │   ├── family-info.service.ts
│   │   │   └── dto/
│   │   │       ├── update-personal.dto.ts
│   │   │       ├── update-academic.dto.ts
│   │   │       └── update-family.dto.ts
│   │   │
│   │   ├── program/
│   │   │   ├── program.module.ts
│   │   │   ├── program.controller.ts           # /programs
│   │   │   ├── program.service.ts
│   │   │   ├── eligibility.service.ts          # Evaluates student eligibility
│   │   │   └── dto/
│   │   │       ├── create-program.dto.ts
│   │   │       └── eligibility-rule.dto.ts
│   │   │
│   │   ├── application/
│   │   │   ├── application.module.ts
│   │   │   ├── application.controller.ts       # /applications + /ward/applications
│   │   │   ├── application.service.ts
│   │   │   ├── section.service.ts              # Section save/validate
│   │   │   ├── submission.service.ts           # Submit + post-submit side effects
│   │   │   ├── reference.service.ts            # Generates TRK-2024-XXXXX refs
│   │   │   └── dto/
│   │   │       ├── create-application.dto.ts
│   │   │       ├── section-a.dto.ts
│   │   │       ├── section-b.dto.ts
│   │   │       ├── section-c.dto.ts
│   │   │       ├── section-d.dto.ts
│   │   │       └── section-e.dto.ts
│   │   │
│   │   ├── document/
│   │   │   ├── document.module.ts
│   │   │   ├── document.controller.ts          # /applications/:id/documents
│   │   │   ├── document.service.ts
│   │   │   ├── s3.service.ts                   # Presigned URL generation
│   │   │   └── dto/
│   │   │       └── presign-document.dto.ts
│   │   │
│   │   ├── review/
│   │   │   ├── review.module.ts
│   │   │   ├── review.controller.ts            # /applications/:id/review/*
│   │   │   ├── ward-review.service.ts
│   │   │   ├── county-review.service.ts
│   │   │   └── dto/
│   │   │       ├── ward-review.dto.ts
│   │   │       └── county-review.dto.ts
│   │   │
│   │   ├── disbursement/
│   │   │   ├── disbursement.module.ts
│   │   │   ├── disbursement.controller.ts      # /disbursements
│   │   │   ├── disbursement.service.ts
│   │   │   ├── mpesa.service.ts                # Daraja B2C integration
│   │   │   ├── eft-export.service.ts           # RTGS file generation
│   │   │   ├── receipt.service.ts              # Receipt PDF generation
│   │   │   └── dto/
│   │   │       ├── mpesa-disburse.dto.ts
│   │   │       └── eft-batch.dto.ts
│   │   │
│   │   ├── notification/
│   │   │   ├── notification.module.ts
│   │   │   ├── sms.service.ts                  # Africa's Talking
│   │   │   └── email.service.ts                # SendGrid / Resend
│   │   │
│   │   ├── reporting/
│   │   │   ├── reporting.module.ts
│   │   │   ├── reporting.controller.ts         # /reports
│   │   │   ├── dashboard.service.ts
│   │   │   ├── ocob-report.service.ts
│   │   │   └── export.service.ts               # Excel/CSV generation
│   │   │
│   │   ├── ai/
│   │   │   ├── ai.module.ts
│   │   │   ├── ai.controller.ts                # /applications/:id/score
│   │   │   ├── ai-score.service.ts             # Score card retrieval
│   │   │   └── scoring-weights.service.ts      # County weight config
│   │   │
│   │   └── internal/
│   │       ├── internal.module.ts
│   │       ├── internal.controller.ts          # /internal/* (AI service only)
│   │       └── service-auth.guard.ts           # Service API key validation
│   │
│   └── prisma/
│       └── schema.prisma                       # Complete Prisma schema
│
├── test/
│   ├── unit/
│   │   ├── auth.service.spec.ts
│   │   ├── application.service.spec.ts
│   │   ├── eligibility.service.spec.ts
│   │   └── review.service.spec.ts
│   └── integration/
│       ├── application.e2e-spec.ts
│       └── disbursement.e2e-spec.ts
│
├── Dockerfile
├── tsconfig.json
├── nest-cli.json
└── package.json
```

---

## apps/ai-scoring — FastAPI (Python)

```
apps/ai-scoring/
├── src/
│   ├── main.py                                 # FastAPI app + CORS + startup
│   │
│   ├── api/
│   │   ├── routes/
│   │   │   ├── scoring.py                      # POST /score, GET /score/:id
│   │   │   ├── weights.py                      # POST /weights/validate
│   │   │   └── health.py                       # GET /health
│   │   └── deps.py                             # Shared dependencies (auth, DB)
│   │
│   ├── scoring/
│   │   ├── pipeline.py                         # Orchestrates full scoring flow
│   │   ├── structured.py                       # Rule-based scoring on form fields
│   │   ├── document_analysis.py                # Claude vision API integration
│   │   ├── anomaly_detection.py                # Cross-application checks
│   │   ├── composite.py                        # Weighted score aggregation
│   │   └── models.py                           # Pydantic models for score data
│   │
│   ├── integrations/
│   │   ├── nestjs_client.py                    # HTTP client for internal NestJS API
│   │   └── anthropic_client.py                 # Claude API client
│   │
│   ├── config.py                               # Settings (pydantic BaseSettings)
│   └── logging.py                              # Structured logging setup
│
├── tests/
│   ├── test_scoring.py
│   ├── test_document_analysis.py
│   └── fixtures/                               # Sample application data for tests
│
├── Dockerfile
├── requirements.txt
└── pyproject.toml
```

---

## packages/shared-types

```
packages/shared-types/
├── src/
│   ├── application.ts                          # Application, ApplicationStatus, Section types
│   ├── user.ts                                 # User, UserRole, Profile types
│   ├── program.ts                              # BursaryProgram, EligibilityRule types
│   ├── county.ts                               # County, Ward types
│   ├── scoring.ts                              # AIScoreCard, ScoringDimension types
│   ├── disbursement.ts                         # DisbursementRecord types
│   ├── api.ts                                  # API request/response envelope types
│   └── index.ts                                # Barrel export
├── tsconfig.json
└── package.json
```

---

## infra/terraform

```
infra/terraform/
├── main.tf                                     # Provider config + backends
├── variables.tf
├── outputs.tf
│
├── modules/
│   ├── vpc/                                    # VPC, subnets, NAT gateway
│   ├── ecs/                                    # ECS cluster + task definitions
│   ├── rds/                                    # PostgreSQL RDS Multi-AZ
│   ├── elasticache/                            # Redis cluster
│   ├── s3/                                     # Document bucket + CDN bucket
│   ├── cloudfront/                             # CDN distribution
│   ├── alb/                                    # Application Load Balancer
│   ├── iam/                                    # Service roles + policies
│   └── secrets/                                # AWS Secrets Manager entries
│
├── environments/
│   ├── staging/
│   │   └── terraform.tfvars
│   └── production/
│       └── terraform.tfvars
```

---

## infra/docker

```
infra/docker/
├── docker-compose.yml                          # Full local stack
├── docker-compose.test.yml                     # Integration test stack
└── nginx/
    └── nginx.conf                              # Local reverse proxy config
```

---

## .github/workflows

```
.github/workflows/
├── ci.yml
│   # Triggers: push to any branch, PR to main
│   # Jobs:
│   #   - lint (ESLint + Prettier)
│   #   - type-check (tsc)
│   #   - unit-tests (Jest + pytest)
│   #   - integration-tests (Testcontainers)
│   #   - security-scan (Snyk)
│   #   - docker-build (verify images build)
│
├── deploy-staging.yml
│   # Triggers: push to main
│   # Jobs:
│   #   - build Docker images
│   #   - push to ECR
│   #   - run DB migrations (prisma migrate deploy)
│   #   - deploy to ECS staging
│   #   - run E2E tests (Playwright)
│   #   - notify Slack
│
└── deploy-production.yml
    # Triggers: manual (workflow_dispatch) with environment: production approval
    # Jobs:
    #   - pull staging images (already built)
    #   - run DB migrations (production)
    #   - deploy to ECS production (blue/green)
    #   - smoke test
    #   - notify Slack + PagerDuty
```

---

## Environment Variables Reference

```bash
# .env.example

# ─── App ───────────────────────────────────────
NODE_ENV=development
PORT=3001

# ─── Database ──────────────────────────────────
DATABASE_URL=postgresql://dev:dev@localhost:5432/kaunty_dev
DATABASE_DIRECT_URL=postgresql://dev:dev@localhost:5432/kaunty_dev  # for migrations

# ─── Redis ─────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ─── Auth ──────────────────────────────────────
JWT_PRIVATE_KEY=<RS256 private key base64>
JWT_PUBLIC_KEY=<RS256 public key base64>
REFRESH_TOKEN_SECRET=<32-byte random hex>
ACCESS_TOKEN_EXPIRY=900          # 15 minutes in seconds
REFRESH_TOKEN_EXPIRY=604800      # 7 days in seconds

# ─── AWS ───────────────────────────────────────
AWS_REGION=af-south-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=kaunty-documents-prod
AWS_S3_DOCUMENTS_PATH=counties/
CLOUDFRONT_DOMAIN=cdn.kaunty.co.ke

# ─── Secrets Manager ───────────────────────────
PII_ENCRYPTION_KEY_SECRET_NAME=kaunty/pii-key
SERVICE_API_KEY_SECRET_NAME=kaunty/ai-service-key

# ─── Africa's Talking ──────────────────────────
AT_API_KEY=
AT_USERNAME=kaunty
AT_SENDER_ID=KauntyGov

# ─── SendGrid ──────────────────────────────────
SENDGRID_API_KEY=
EMAIL_FROM=noreply@kaunty.co.ke

# ─── M-Pesa Daraja ─────────────────────────────
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_B2C_SHORTCODE=
MPESA_B2C_INITIATOR_NAME=
MPESA_B2C_INITIATOR_PASSWORD=
MPESA_ENV=sandbox          # sandbox | production

# ─── AI Scoring Service ────────────────────────
AI_SERVICE_URL=http://ai-scoring:8000
AI_SERVICE_API_KEY=

# ─── Anthropic (used by AI service) ───────────
ANTHROPIC_API_KEY=

# ─── Frontend (Next.js) ────────────────────────
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
```