# KauntyBursary — Product Requirements Document
**Version:** 1.0.0  
**Status:** Production-Ready Draft  
**Last Updated:** 2025  
**Authors:** Engineering Leadership

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Non-Goals](#3-goals--non-goals)
4. [User Personas](#4-user-personas)
5. [Functional Requirements](#5-functional-requirements)
6. [User Flows](#6-user-flows)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Data Model Overview](#8-data-model-overview)
9. [Integrations & Dependencies](#9-integrations--dependencies)
10. [Constraints & Assumptions](#10-constraints--assumptions)
11. [Risks & Open Questions](#11-risks--open-questions)
12. [Success Metrics](#12-success-metrics)

---

## 1. Executive Summary

KauntyBursary is a multi-tenant SaaS platform designed to digitize, standardize, and audit the bursary management lifecycle across Kenya's 47 county governments. It replaces paper-based, ward-level bursary application processes with a unified digital system supporting student self-registration, AI-assisted application scoring, committee review, and M-Pesa/bank disbursement — all within a single auditable platform.

The platform's core innovation is a **digitized form-fill experience** that mirrors the official physical bursary form (as gazetted in county legislation, e.g. Turkana County Education Fund Second Schedule No. 4, 2023), allows students to fill it digitally, preview a county-branded PDF render identical to the official form, and download or submit it electronically. An embedded AI scoring engine then analyses each submitted application to give ward committees a quantitative recommendation before final human approval.

**Target Market:** All 47 Kenyan county governments and their ward bursary committees.  
**Pricing Model:** Per-county SaaS subscription (tiered by county budget envelope and application volume).  
**Tech Stack:** Next.js 14 (frontend), NestJS (backend), PostgreSQL + Redis, AWS S3, Docker/Kubernetes.

---

## 2. Problem Statement

### 2.1 The Current Reality

Kenya's ward bursary programs collectively disburse billions of KES annually. Yet the operational reality at ward level is:

- **Paper forms** submitted physically to ward offices, creating physical queues, lost documents, and data entry backlogs.
- **No duplicate detection** — the same student can apply across multiple wards or submit multiple times within the same program cycle.
- **Manual scoring** by ward committees with no standardized criteria, creating inconsistency and allegations of nepotism.
- **Zero disbursement trail** — funds are often disbursed by cheque with no digital link between the approved application and the payment, making OCOB audits manual and error-prone.
- **County finance officers** cannot run real-time budget utilization reports; they rely on end-of-cycle Excel consolidations.

### 2.2 What the MVP Solved

The existing Flask MVP solved the single-county, single-ward digitization problem. It proves the domain model is correct but is not deployable at production scale for 47 counties because: it has no multi-tenancy, no AI scoring, no disbursement integration, no PDF form generation, no mobile support, and several documented implementation gaps.

### 2.3 What This Platform Solves

KauntyBursary solves the 47-county problem with a production-grade, auditable system where:
- Every application is digital, deduplicated, and timestamped.
- The ward committee gets an AI-generated score card before reviewing.
- Disbursement is triggered directly from the approved application to M-Pesa or bank.
- County finance officers get real-time OCOB-ready reports.
- The entire system is configurable per county without code changes.

---

## 3. Goals & Non-Goals

### 3.1 Goals (v1 — Year 1)

| # | Goal | Success Indicator |
|---|------|-------------------|
| G1 | Onboard 5 pilot counties end-to-end | 5 counties live, at least 1 full intake cycle completed |
| G2 | Digitize the full bursary application lifecycle | Zero paper forms for enrolled counties |
| G3 | Generate county-branded PDF that mirrors the official form | 100% visual fidelity to gazetted form |
| G4 | AI scoring assists committee in ranking applications | AI score present on 100% of submitted applications |
| G5 | Disbursement export to M-Pesa B2C and bank EFT | Disbursement triggered from system for ≥80% of approved applications |
| G6 | Real-time OCOB-ready financial reports | Reports generated in <10 seconds |
| G7 | Full audit trail on every application state change | Zero untraced status transitions |

### 3.2 Non-Goals (v1)

- Student loan management (HELB integration is read-reference only, not transactional).
- Tertiary institution portals as first-class tenants (institutions verify via API token only).
- AI auto-approval without human review (AI assists, humans decide).
- Multi-language support beyond English and Swahili.
- Mobile native apps (progressive web app serves mobile in v1; native app is v2).
- Inter-county bursary applications.

---

## 4. User Personas

### P1 — Student Applicant
**Profile:** Age 14–26, lives in a ward within a county, applying for bursary to cover secondary school, college/TVET, or university fees.  
**Tech literacy:** Moderate. Has a smartphone (likely Safaricom SIM). May use shared devices.  
**Key needs:** Simple form that mirrors the paper they know, SMS updates, ability to download their filled form, know their application status.  
**Pain point:** Walking to a ward office, losing paper forms, not knowing if they were approved.

### P2 — Ward Administrator
**Profile:** A county public servant assigned to one or more wards. Reviews applications for their ward(s). Non-technical.  
**Key needs:** See all ward applications ranked by AI score. Approve, reject, or recommend with a note. Export ward summary to Excel/PDF.  
**Pain point:** Hundreds of paper forms to read and rank manually.

### P3 — County Finance Officer
**Profile:** Senior county official managing the bursary budget envelope. Approves final allocation after ward recommendation.  
**Key needs:** See budget utilization in real time. Trigger disbursement. Generate OCOB report.  
**Pain point:** Manual consolidation of ward Excel files at end of cycle.

### P4 — County Super Admin
**Profile:** IT-adjacent county official (or county Secretary). Manages the county's tenant configuration: programs, ward structure, branding, user accounts.  
**Key needs:** Configure bursary programs (dates, budget, eligibility). Manage ward admin accounts. Customise form and county branding.

### P5 — Platform Operator (SaaS team)
**Profile:** Internal engineering/ops team member.  
**Key needs:** Onboard new county tenants. Monitor system health. Manage billing. Override blocked accounts.

### P6 — AI Committee Assistant (AI agent, not a human persona)
**Profile:** An AI scoring agent that processes submitted applications and generates a score card for the ward committee.  
**Key needs:** Access to application data (family details, academic info, financial status, document analysis). Outputs a score (0–100) with a breakdown by dimension.

---

## 5. Functional Requirements

### 5.1 Tenant Management

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| TM-01 | The system shall support multiple county tenants with complete data isolation. | No query returns data from a different county_id. Verified by integration test. |
| TM-02 | Each county tenant shall have a configurable brand profile: logo, primary colour, county name. | PDF renders, portal header, and email footer reflect county branding. |
| TM-03 | The system shall allow a Platform Operator to provision a new county in under 5 minutes. | Provisioning API call seeds county, 1,450 wards (from national ward registry), and Super Admin account. |
| TM-04 | Counties shall choose a subscription plan (Basic, Standard, Enterprise) that gates feature access. | Feature flags enforced at API level by plan_tier. |

### 5.2 Authentication & Identity

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| AU-01 | The system shall support email + password registration with email verification. | Unverified accounts cannot submit applications. |
| AU-02 | The system shall enforce phone number verification via OTP (Africa's Talking) for student accounts. | Phone OTP required before first application submission. |
| AU-03 | The system shall implement JWT access tokens (15 min) with HttpOnly refresh tokens (7 days). | Access tokens expire and are rejected after 15 min without refresh. |
| AU-04 | The system shall enforce role-based access control: STUDENT, WARD_ADMIN, FINANCE_OFFICER, COUNTY_ADMIN, PLATFORM_OPERATOR. | Each role can only access endpoints defined for their role. |
| AU-05 | Ward admins shall only see applications belonging to their assigned ward(s). | RLS enforces ward_id filter; cross-ward data never returned. |

### 5.3 Student Profile & Registration

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| SP-01 | Students shall complete a multi-step registration: account → personal details → academic info. | Incomplete profiles blocked from application submission. |
| SP-02 | The system shall capture all fields defined in the official county bursary form (Sections A–G of Turkana County gazetted form, generalised for all counties). | Field mapping table validated against official form. |
| SP-03 | National ID numbers shall be unique per county (not globally). | Duplicate national_id + county_id insert rejected at DB level. |
| SP-04 | The system shall capture: family status (both parents alive, single parent, orphan, disability), guardian income (father/mother/guardian in KES), sibling education details, HELB status, and prior bursary receipt disclosure. | All fields stored and surfaced in AI scoring and committee view. |

### 5.4 Bursary Programs

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| BP-01 | County Admins shall create bursary programs with: name, description, ward scope (all wards or specific wards), budget ceiling, application window (opens_at / closes_at), and eligibility rules (education level, income bracket). | Programs enforce eligibility at submission time. |
| BP-02 | The system shall show students only programs they are eligible for based on their profile. | Ineligible programs are hidden or shown with a lock + reason. |
| BP-03 | The system shall prevent applications after closes_at. | Late submissions rejected with a 422 and clear error message. |
| BP-04 | Budget ceiling shall be enforced with advisory locks during allocation. | Over-allocation never occurs; concurrent approvals are serialised. |

### 5.5 Application Submission & Form Experience

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| AF-01 | The application form shall be a multi-step wizard matching the sections of the official physical form: A (Personal), B (Amounts), C (Family), D (Financial Status), E (Other Disclosures), F (Declarations). | All form fields map to the official form sections. |
| AF-02 | The final step before submission shall render a **PDF preview** of the completed form, styled with the county logo and official form layout, identical in structure to the gazetted form. | PDF preview rendered within 3 seconds. Visual diff against reference form < 5% deviation. |
| AF-03 | The student shall be able to **download the filled PDF** before and after submission. | Download generates a county-branded, pre-filled PDF with all student data. |
| AF-04 | The system shall support document uploads per the official requirements: fees structure, admission letter, performance report/transcript, school/college ID, NCPWD card, death certificate, and other supporting documents. | Each document type is validated, virus scanned, and stored in S3. |
| AF-05 | The system shall detect and reject duplicate applications (same student, same program). | Unique constraint enforced; duplicate attempt returns 409 with explanation. |
| AF-06 | County admins shall be able to customise the form colour scheme, logo placement, and section ordering within allowed configuration parameters. | Form customisation UI available in County Admin settings. |

### 5.6 AI Scoring Engine

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| AI-01 | Upon successful application submission, an AI scoring job shall be enqueued automatically. | Scoring job triggered within 5 seconds of submission confirmation. |
| AI-02 | The AI agent shall analyse: family financial status, education level and institution, orphan/disability status, number of dependants, prior bursary receipt, sibling education burden, and document quality. | Scoring model returns a score 0–100 with a dimension breakdown. |
| AI-03 | The AI score card shall be visible to Ward Admins and Finance Officers only (not to students). | Score card hidden from STUDENT role. |
| AI-04 | The AI agent shall flag anomalies: inconsistent income declarations, duplicate national IDs across applications, document quality issues. | Anomaly flags displayed on application card with description. |
| AI-05 | County Admins shall be able to configure scoring weights per dimension (e.g., increase weight for orphan status). | Weight configuration stored per county; scoring recalculates on weight change. |
| AI-06 | The AI shall never auto-approve or auto-reject; it shall only recommend. | No application status changes without a human actor in the audit trail. |

### 5.7 Review Workflow

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| RW-01 | Applications shall flow through: DRAFT → SUBMITTED → WARD_REVIEW → COUNTY_REVIEW → APPROVED / REJECTED / WAITLISTED. | Each status transition logged in application_timeline with actor_id. |
| RW-02 | Ward Admins shall be able to recommend, return, or reject applications at the WARD_REVIEW stage. | Recommended amount cannot exceed program amount. |
| RW-03 | Finance Officers shall make the final allocation decision at the COUNTY_REVIEW stage. | Budget enforcement advisory lock runs at this stage. |
| RW-04 | Every status change shall generate an SMS notification to the student. | SMS dispatched within 60 seconds of status change. |
| RW-05 | Committee members shall be able to add a review note visible in the audit trail. | Review note stored on application_reviews and shown in timeline. |

### 5.8 Disbursement

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| DB-01 | Finance Officers shall be able to trigger M-Pesa B2C disbursement for approved applications. | M-Pesa B2C API call made; transaction ID stored; status updated. |
| DB-02 | The system shall support bank EFT export in RTGS format for batch disbursement. | RTGS file generated with correct format; downloadable by Finance Officer. |
| DB-03 | The system shall generate a disbursement receipt PDF per student upon confirmed payment. | Receipt PDF available for download from student portal. |
| DB-04 | Failed disbursements shall be flagged and retried up to 3 times before manual intervention is required. | Retry logic in queue; failed after 3 attempts triggers alert to Finance Officer. |

### 5.9 Reporting

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| RP-01 | County Admins and Finance Officers shall access a real-time dashboard: applications by status, budget utilization, ward breakdown. | Dashboard data refreshes within 30 seconds. |
| RP-02 | The system shall generate OCOB-ready financial reports (Excel and PDF) showing allocations, disbursements, and balances per program. | Report format matches OCOB submission template. |
| RP-03 | Ward Admins shall export ward-level application summaries as Excel and PDF. | Export includes AI score, recommendation, and reviewer name. |
| RP-04 | The system shall support historical trend analysis across intake cycles. | Reports filterable by year, program, ward, education level. |

---

## 6. User Flows

### 6.1 Student Application Flow

```
[Register account]
    → Email verification
    → Phone OTP verification
    → [Complete Profile — Step 1: Personal Details]
        → [Step 2: Academic Info]
            → [Step 3: Family & Financial Details]
                → [View eligible programs]
                    → [Select program]
                        → [Application Wizard]
                            → Section A: Personal (pre-filled from profile)
                            → Section B: Amounts Applied
                            → Section C: Family Details
                            → Section D: Financial Status
                            → Section E: Other Disclosures
                            → Section F: Upload Documents
                            → Section G: Preview PDF (county-branded, full form render)
                                → [Download PDF] (optional)
                                → [Confirm & Submit]
                                    → AI scoring job enqueued
                                    → SMS: "Application received"
                                    → [Track application status]
```

### 6.2 Ward Admin Review Flow

```
[Login as Ward Admin]
    → [Ward Dashboard: applications ranked by AI score]
        → [Select application]
            → [View full application + AI score card + anomaly flags]
                → [View uploaded documents]
                    → [Enter review note]
                        → [Recommend / Return to student / Reject]
                            → Status → COUNTY_REVIEW (if recommended)
                            → Student SMS dispatched
```

### 6.3 Finance Officer Disbursement Flow

```
[Login as Finance Officer]
    → [County Review Queue: ward-recommended applications]
        → [Review AI score + ward recommendation]
            → [Set final allocation amount]
                → [Approve / Reject / Waitlist]
                    → [Approved applications enter Disbursement Queue]
                        → [Select: M-Pesa B2C or EFT batch export]
                            → M-Pesa: trigger per-student B2C call
                            → EFT: generate RTGS file, download
                                → [Mark as disbursed on confirmation]
                                    → [OCOB report generation]
```

### 6.4 County Admin Configuration Flow

```
[Login as County Admin]
    → [Settings: Upload county logo, set primary colour, confirm county name]
        → [Manage Wards: assign ward admins, configure ward budgets]
            → [Create Bursary Program]
                → Set name, description, ward scope, budget, dates
                → Configure eligibility rules (income bracket, education level)
                → Configure AI scoring weights
                    → [Publish program]
                        → Students see program on portal
```

---

## 7. Non-Functional Requirements

### 7.1 Performance

| Metric | Target |
|--------|--------|
| API P95 response time | < 300ms (read), < 500ms (write) |
| PDF preview generation | < 3 seconds |
| AI scoring job completion | < 30 seconds after submission |
| Dashboard data refresh | < 30 seconds |
| Concurrent intake peak load | 500 concurrent write requests/second sustained |

### 7.2 Availability

| Metric | Target |
|--------|--------|
| System uptime | 99.5% (allows ~44 hours downtime/year) |
| Planned maintenance windows | Off-peak hours (02:00–04:00 EAT) |
| RTO (Recovery Time Objective) | < 4 hours |
| RPO (Recovery Point Objective) | < 1 hour |

### 7.3 Scalability

- Horizontal scaling of application service via Kubernetes HPA during intake peaks.
- Database read replicas for reporting queries.
- CDN for static assets and pre-generated reports.
- BullMQ worker pools for AI scoring and notification fan-out.

### 7.4 Security

- All data encrypted in transit (TLS 1.3).
- Sensitive PII (national ID) encrypted at rest (AES-256, AWS KMS).
- OWASP Top 10 compliance verified by CI security scan.
- Kenya Data Protection Act 2019 compliance.
- RBAC enforced at API gateway and database (RLS) layers.
- Document uploads antivirus scanned before acceptance.

### 7.5 Accessibility & Localisation

- WCAG 2.1 AA compliance for student portal.
- English and Swahili interface strings (i18n via next-intl).
- Mobile-first responsive design (student portal targets 320px–768px primary viewport).
- Low-bandwidth mode: images lazy-loaded, critical CSS inlined.

---

## 8. Data Model Overview

### Core Entities

| Entity | Description |
|--------|-------------|
| `County` | A tenant. Owns all data within the system. |
| `Ward` | Administrative sub-unit of a county. Scopes applications and programs. |
| `User` | All authenticated actors (students, admins, finance officers). Role-based. |
| `StudentProfile` | Extended personal data for STUDENT role (Section A of form). |
| `AcademicInfo` | Institution, education level, bank details (Section A/B of form). |
| `FamilyFinancialInfo` | Sections C & D of form: family status, income, siblings, dependants. |
| `BursaryProgram` | A funding opportunity with budget, dates, and eligibility rules. |
| `Application` | A student's submission to a program. Lifecycle-managed entity. |
| `ApplicationSection` | Stores section-by-section form data (JSON) to support partial saves. |
| `Document` | Uploaded supporting file (S3 reference + scan status). |
| `ApplicationReview` | A reviewer's decision at a given workflow stage. |
| `ApplicationTimeline` | Immutable audit log of every state transition. |
| `AIScoreCard` | AI analysis result per application: total score + dimension breakdown. |
| `DisbursementRecord` | M-Pesa/EFT transaction linked to an approved application. |

### Key Relationships

- A `County` has many `Wards`, `Users`, `BursaryPrograms`, and `Applications`.
- A `User` (STUDENT) has one `StudentProfile`, one `AcademicInfo`, one `FamilyFinancialInfo`, and many `Applications`.
- A `BursaryProgram` has many `Applications` and many `EligibilityRules`.
- An `Application` has many `Documents`, many `ApplicationTimeline` entries, one `AIScoreCard`, and one final `ApplicationReview`.
- A `DisbursementRecord` is linked one-to-one with an approved `Application`.

---

## 9. Integrations & Dependencies

| Integration | Purpose | Provider | Risk |
|-------------|---------|----------|------|
| M-Pesa Daraja API | Student disbursement via B2C | Safaricom | API rate limits; requires MPesa Business shortcode |
| Africa's Talking SMS | OTP and status notification SMS | Africa's Talking | SMS delivery in low-coverage wards |
| AWS S3 (or Cloudflare R2) | Document storage | AWS / Cloudflare | Cost; GDPR-equivalent compliance |
| SendGrid / Resend | Transactional email | SendGrid | Deliverability; spam filters |
| NEMIS API | Student enrollment verification (optional) | MoE Kenya | API availability; authentication required |
| OpenAI API (or Anthropic Claude) | AI scoring analysis | Anthropic/OpenAI | Cost per application; latency |
| react-pdf / Puppeteer | PDF form generation | Open source | PDF rendering consistency across OSes |
| ClamAV | Document virus scanning | Open source | Latency; false positives |

---

## 10. Constraints & Assumptions

### Constraints

- All personally identifiable data (national IDs, bank accounts) must be stored within the Kenyan AWS region (af-south-1 Cape Town as closest; or eu-west-1 with data residency addendum).
- M-Pesa B2C requires a registered Safaricom Business shortcode per county (or a shared platform shortcode with sub-account mapping).
- The PDF output must be visually identical to the official gazetted county form — this is a legal requirement for audit purposes.
- The AI engine must never auto-change application status; it is advisory only (legal compliance with public procurement rules).

### Assumptions

- Counties have internet connectivity at the ward office level (may be mobile data).
- Students have access to a smartphone or shared computer with a browser.
- County governments will provide their official logos in SVG or high-resolution PNG.
- Each county will assign at least one technical point of contact for onboarding.
- NEMIS integration is optional for v1; fallback is institution-issued admission number.

---

## 11. Risks & Open Questions

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| M-Pesa B2C approval per county takes time | High | High | Process shortcode approvals early; EFT export is fallback |
| County governments resist digital-only submissions | Medium | High | Hybrid mode: digital form → printed PDF still valid |
| AI scoring perceived as biased | Medium | Very High | Transparency: show scoring breakdown; allow committee override; weights configurable |
| NEMIS API unavailability | High | Low | NEMIS verification optional; admission number as fallback |
| Low digital literacy among students in rural counties | High | Medium | SMS-first UX; field agent mode for ward offices to assist |
| Data breach of student PII | Low | Very High | KMS encryption, RLS, pen testing, breach notification SOP |

### Open Questions

1. Will the platform shortcode model work for M-Pesa B2C, or does each county need its own shortcode?
2. What is the OCOB's preferred machine-readable format for financial reports (Excel, CSV, or XML)?
3. Should sibling education burden table (Section 15 of the Turkana form) be a repeatable dynamic form row or a fixed 5-row table?
4. Is there a national ward code registry (GIS shapefile) that can be imported as the seed data for all 1,450 wards?
5. Should AI scoring weights be county-configurable (risk of gaming) or platform-standardised (risk of poor fit)?

---

## 12. Success Metrics

### Product Metrics (Year 1)

| Metric | Target |
|--------|--------|
| Counties onboarded | 5 |
| Total applications processed | 50,000 |
| Paper forms eliminated | 100% within enrolled counties |
| Average application completion rate | > 70% |
| Student satisfaction (NPS) | > 40 |
| Average time from submission to disbursement | < 21 days (vs. current ~90 days) |

### Engineering Metrics

| Metric | Target |
|--------|--------|
| API error rate | < 0.5% |
| P95 response time | < 300ms |
| AI scoring job failure rate | < 1% |
| Test coverage (unit + integration) | > 80% |
| Zero critical security vulnerabilities | CI/CD gate enforced |

### Business Metrics

| Metric | Target |
|--------|--------|
| Monthly Recurring Revenue (Year 1) | KES 2.5M+ |
| County churn rate | < 5% |
| Support tickets per county per month | < 10 |