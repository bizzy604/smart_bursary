# KauntyBursary — API Design Specification
**Version:** 1.0.0  
**Base URL:** `https://api.kaunty.co.ke/api/v1`  
**Protocol:** REST over HTTPS (TLS 1.3)  
**Auth:** JWT Bearer token (access) + HttpOnly cookie (refresh)  
**References:** PRD v1.0.0, System Design v1.0.0, Database Architecture v1.0.0

---

## Table of Contents
1. [API Overview](#1-api-overview)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Standard Conventions](#3-standard-conventions)
4. [Error Handling Model](#4-error-handling-model)
5. [Auth Endpoints](#5-auth-endpoints)
6. [Profile Endpoints](#6-profile-endpoints)
7. [Program Endpoints](#7-program-endpoints)
8. [Application Endpoints](#8-application-endpoints)
9. [Document Endpoints](#9-document-endpoints)
10. [AI Score Endpoints](#10-ai-score-endpoints)
11. [Review Endpoints](#11-review-endpoints)
12. [Disbursement Endpoints](#12-disbursement-endpoints)
13. [Reporting Endpoints](#13-reporting-endpoints)
14. [Admin / Tenant Endpoints](#14-admin--tenant-endpoints)
15. [Internal Endpoints](#15-internal-endpoints)
16. [Rate Limiting](#16-rate-limiting)
17. [Versioning & Deprecation](#17-versioning--deprecation)

---

## 1. API Overview

### API Style

REST with resource-oriented URLs. Multi-tenancy is resolved from the JWT claim (`county_id`) — no tenant prefix in the URL path. All tenant-scoped responses are automatically filtered by the authenticated user's county.

### Consumer Summary

| Consumer | Auth Method | Primary Endpoints |
|----------|-------------|------------------|
| Student portal (Next.js) | JWT Bearer | /auth, /profile, /programs, /applications |
| Admin portal (Next.js) | JWT Bearer | /programs, /applications, /reviews, /reports |
| Finance portal (Next.js) | JWT Bearer | /reviews, /disbursements, /reports |
| Platform ops dashboard | JWT Bearer (PLATFORM_OPERATOR role) | /admin/tenants |
| AI Scoring Service (internal) | Service API key | /internal/* |
| Institution verifiers (optional) | API key | /verify/* |

---

## 2. Authentication & Authorization

### Token Scheme

```
Access token:  JWT (RS256), 15 minutes, in Authorization header
Refresh token: Opaque UUID (SHA-256 hashed in Redis), 7 days, in HttpOnly Secure cookie

JWT claims:
{
  "sub": "<user_id>",
  "county_id": "<county_id>",
  "ward_id": "<ward_id_or_null>",
  "role": "STUDENT | WARD_ADMIN | FINANCE_OFFICER | COUNTY_ADMIN | PLATFORM_OPERATOR",
  "iat": <issued_at>,
  "exp": <expiry>
}
```

### Role Permissions Matrix

| Endpoint Group | STUDENT | WARD_ADMIN | FINANCE_OFFICER | COUNTY_ADMIN | PLATFORM_OPERATOR |
|----------------|---------|-----------|-----------------|-------------|-------------------|
| Auth | ✓ | ✓ | ✓ | ✓ | ✓ |
| Own Profile | ✓ | — | — | — | — |
| Programs (read) | ✓ (eligible only) | ✓ | ✓ | ✓ | ✓ |
| Programs (write) | — | — | — | ✓ | ✓ |
| Own Applications | ✓ | — | — | — | — |
| Ward Applications | — | ✓ (own ward) | ✓ | ✓ | ✓ |
| AI Score Cards | — | ✓ | ✓ | ✓ | ✓ |
| Ward Reviews | — | ✓ | — | — | — |
| County Reviews | — | — | ✓ | — | — |
| Disbursements | — | — | ✓ | — | ✓ |
| Reports | — | ✓ (ward only) | ✓ | ✓ | ✓ |
| Tenant Admin | — | — | — | ✓ | ✓ |
| Platform Admin | — | — | — | — | ✓ |

---

## 3. Standard Conventions

### Request Headers

```
Authorization: Bearer <access_token>
Content-Type: application/json
Accept: application/json
X-Request-Id: <uuid>          (optional, echoed in response for tracing)
Accept-Language: en | sw       (for error message localisation)
```

### Pagination

All list endpoints support cursor-based pagination:

```json
// Request query params
?limit=20&cursor=<opaque_cursor>

// Response envelope
{
  "data": [...],
  "pagination": {
    "total": 1420,
    "limit": 20,
    "hasMore": true,
    "nextCursor": "eyJpZCI6Ii4uLiJ9"
  }
}
```

### Filtering & Sorting

```
?status=SUBMITTED,WARD_REVIEW     (comma-separated enum values)
?ward_id=<uuid>
?program_id=<uuid>
?sort=submitted_at:desc           (field:direction)
?search=<text>                    (full-text search where supported)
```

### Timestamps

All timestamps are ISO 8601 UTC: `"2024-08-15T09:30:00Z"`.

### Resource IDs

All IDs are UUIDs. Submission references are human-readable: `TRK-2024-00142`.

---

## 4. Error Handling Model

### Standard Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "details": [
      {
        "field": "national_id",
        "message": "National ID must be 8 digits."
      }
    ],
    "traceId": "4f9a2b1c-...",
    "timestamp": "2024-08-15T09:30:00Z"
  }
}
```

### HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Successful GET, PATCH |
| 201 | Successful POST (resource created) |
| 204 | Successful DELETE |
| 400 | Malformed request body / invalid syntax |
| 401 | Missing or invalid access token |
| 403 | Valid token but insufficient permissions |
| 404 | Resource not found within the tenant |
| 409 | Conflict (duplicate application, budget exhausted) |
| 422 | Semantic validation failure (program closed, ineligible) |
| 429 | Rate limit exceeded |
| 500 | Internal server error (never reveals stack trace) |
| 503 | Service temporarily unavailable (circuit breaker open) |

### Error Codes

| Code | Meaning |
|------|---------|
| `VALIDATION_ERROR` | Field validation failed |
| `DUPLICATE_APPLICATION` | Student already applied to this program |
| `PROGRAM_CLOSED` | Program application window has ended |
| `INELIGIBLE` | Student does not meet program eligibility criteria |
| `BUDGET_EXHAUSTED` | Program budget fully allocated |
| `DOCUMENT_INFECTED` | Uploaded document failed virus scan |
| `PROFILE_INCOMPLETE` | Student profile required before submission |
| `TOKEN_EXPIRED` | Access token has expired |
| `INSUFFICIENT_PERMISSIONS` | Role cannot perform this action |
| `TENANT_NOT_FOUND` | County slug not recognised |

---

## 5. Auth Endpoints

### POST /auth/register

Register a new student account.

**Access:** Public  
**Rate limit:** 10/min per IP

**Request:**
```json
{
  "email": "aisha.lokiru@example.com",
  "password": "SecurePass123!",
  "phone": "+254712345678",
  "county_slug": "turkana",
  "full_name": "Aisha Lokiru"
}
```

**Response 201:**
```json
{
  "data": {
    "user_id": "550e8400-...",
    "email": "aisha.lokiru@example.com",
    "email_verification_sent": true,
    "next_step": "verify_email"
  }
}
```

---

### POST /auth/verify-email

Verify email from token in verification link.

**Request:**
```json
{ "token": "<verification_token>" }
```

**Response 200:**
```json
{
  "data": { "email_verified": true, "next_step": "verify_phone" }
}
```

---

### POST /auth/send-phone-otp

Send OTP to registered phone number.

**Access:** Authenticated (email verified)  
**Rate limit:** 5/min per user

**Response 200:**
```json
{ "data": { "otp_sent": true, "expires_in_seconds": 300 } }
```

---

### POST /auth/verify-phone-otp

**Request:**
```json
{ "otp": "847291" }
```

**Response 200:**
```json
{ "data": { "phone_verified": true } }
```

---

### POST /auth/login

**Request:**
```json
{
  "email": "aisha.lokiru@example.com",
  "password": "SecurePass123!",
  "county_slug": "turkana"
}
```

**Response 200:**
```json
{
  "data": {
    "access_token": "<jwt>",
    "token_type": "Bearer",
    "expires_in": 900,
    "user": {
      "id": "550e8400-...",
      "email": "aisha.lokiru@example.com",
      "role": "STUDENT",
      "full_name": "Aisha Lokiru",
      "profile_complete": false
    }
  }
}
```

*Refresh token set as HttpOnly cookie: `__refresh_token`*

---

### POST /auth/refresh

Exchange refresh token for new access token.

**Auth:** Refresh token cookie (no Bearer header needed)

**Response 200:**
```json
{
  "data": {
    "access_token": "<new_jwt>",
    "expires_in": 900
  }
}
```

---

### POST /auth/logout

Revoke refresh token (add to Redis blocklist).

**Response 204:** No content. Cookie cleared.

---

### POST /auth/forgot-password

```json
{ "email": "aisha.lokiru@example.com", "county_slug": "turkana" }
```

**Response 200:** `{ "data": { "reset_email_sent": true } }` (always 200 regardless of email existence — prevents enumeration)

---

### POST /auth/reset-password

```json
{
  "token": "<reset_token>",
  "new_password": "NewSecurePass456!"
}
```

**Response 200:** `{ "data": { "password_reset": true } }`

---

## 6. Profile Endpoints

### GET /profile

Get authenticated student's complete profile.

**Access:** STUDENT  
**Response 200:**
```json
{
  "data": {
    "personal": {
      "full_name": "Aisha Lokiru",
      "date_of_birth": "2002-03-15",
      "gender": "FEMALE",
      "home_ward": "Kalokol",
      "village_unit": "Nakuprat",
      "phone": "+254712345678",
      "profile_complete": true
    },
    "academic": {
      "institution_type": "UNIVERSITY",
      "institution_name": "University of Nairobi",
      "year_form_class": "Year 2",
      "admission_number": "F56/1234/2023",
      "course_name": "Bachelor of Education",
      "bank_account_name": "Aisha Lokiru",
      "bank_name": "Equity Bank",
      "bank_branch": "Lodwar"
    },
    "family": {
      "family_status": "SINGLE_PARENT",
      "has_disability": false,
      "num_siblings": 4,
      "father_income_kes": 0,
      "mother_income_kes": 18000,
      "num_siblings_in_school": 2,
      "sibling_education_details": [
        {
          "name": "James Lokiru",
          "institution": "Lodwar High School",
          "year_class": "Form 3",
          "total_fees": 42000,
          "fee_paid": 15000,
          "outstanding": 27000
        }
      ]
    }
  }
}
```

---

### PATCH /profile/personal

Update personal details (Section A).

**Access:** STUDENT  
**Request:**
```json
{
  "full_name": "Aisha Lokiru Ekeno",
  "date_of_birth": "2002-03-15",
  "gender": "FEMALE",
  "home_ward": "Kalokol",
  "village_unit": "Nakuprat"
}
```

**Response 200:** Updated personal object.

---

### PATCH /profile/academic

Update academic and bank details.

**Access:** STUDENT  
**Request:** Academic info fields as JSON.  
**Response 200:** Updated academic object.

---

### PATCH /profile/family

Update family and financial details (Sections C & D).

**Access:** STUDENT  
**Request:** Family info fields including sibling_education_details array.  
**Response 200:** Updated family object.

---

### GET /profile/completion

Returns profile completion status by section.

**Response 200:**
```json
{
  "data": {
    "personal": true,
    "academic": true,
    "family": false,
    "overall_complete": false,
    "missing_sections": ["family"]
  }
}
```

---

## 7. Program Endpoints

### GET /programs

List eligible bursary programs for the authenticated student.

**Access:** STUDENT (filtered by eligibility), WARD_ADMIN, FINANCE_OFFICER, COUNTY_ADMIN  
**Query params:** `?status=ACTIVE&ward_id=<uuid>&academic_year=2024/2025`

**Response 200:**
```json
{
  "data": [
    {
      "id": "prog-uuid-...",
      "name": "2024 Ward Bursary Programme",
      "ward_scope": "ALL",
      "budget_ceiling": 5000000.00,
      "allocated_total": 2150000.00,
      "available_budget": 2850000.00,
      "opens_at": "2024-08-01T00:00:00Z",
      "closes_at": "2024-08-31T23:59:59Z",
      "status": "ACTIVE",
      "academic_year": "2024/2025",
      "eligible": true,
      "ineligibility_reason": null
    }
  ],
  "pagination": { "total": 3, "hasMore": false }
}
```

---

### GET /programs/:id

Get program detail including eligibility rules.

**Response 200:** Single program object with `eligibility_rules` array.

---

### POST /programs

Create a new bursary program.

**Access:** COUNTY_ADMIN  
**Request:**
```json
{
  "name": "2024 Ward Bursary Programme",
  "description": "Annual ward bursary for Kalokol Ward",
  "ward_id": null,
  "budget_ceiling": 5000000.00,
  "opens_at": "2024-08-01T00:00:00Z",
  "closes_at": "2024-08-31T23:59:59Z",
  "academic_year": "2024/2025",
  "eligibility_rules": [
    {
      "rule_type": "EDUCATION_LEVEL",
      "parameters": { "allowed": ["SECONDARY", "COLLEGE_TVET", "UNIVERSITY"] }
    },
    {
      "rule_type": "INCOME_BRACKET",
      "parameters": { "max_annual_income_kes": 600000 }
    }
  ]
}
```

**Response 201:** Created program object.

---

### PATCH /programs/:id

Update program (only allowed when status is DRAFT).

**Access:** COUNTY_ADMIN

---

### POST /programs/:id/publish

Publish program (DRAFT → ACTIVE).

**Access:** COUNTY_ADMIN  
**Response 200:** `{ "data": { "status": "ACTIVE" } }`

---

### POST /programs/:id/close

Manually close program ahead of closes_at.

**Access:** COUNTY_ADMIN

---

## 8. Application Endpoints

### POST /applications

Create a new application draft.

**Access:** STUDENT  
**Request:**
```json
{ "program_id": "prog-uuid-..." }
```

**Response 201:**
```json
{
  "data": {
    "id": "app-uuid-...",
    "status": "DRAFT",
    "submission_reference": null,
    "program": { "id": "...", "name": "2024 Ward Bursary Programme" },
    "sections_complete": {
      "A": true,
      "B": false,
      "C": true,
      "D": false,
      "E": false,
      "F": false
    }
  }
}
```

**Errors:**
- `409 DUPLICATE_APPLICATION` — already applied to this program
- `422 INELIGIBLE` — does not meet eligibility criteria
- `422 PROGRAM_CLOSED` — program window ended
- `422 PROFILE_INCOMPLETE` — profile not fully completed

---

### GET /applications

List student's own applications.

**Access:** STUDENT  
**Query:** `?status=SUBMITTED&program_id=<uuid>`

**Response 200:**
```json
{
  "data": [
    {
      "id": "app-uuid-...",
      "program_name": "2024 Ward Bursary Programme",
      "status": "WARD_REVIEW",
      "submission_reference": "TRK-2024-00142",
      "amount_requested": 45000.00,
      "amount_allocated": null,
      "submitted_at": "2024-08-10T14:23:00Z",
      "last_updated_at": "2024-08-12T09:00:00Z"
    }
  ]
}
```

---

### GET /applications/:id

Get full application detail (student sees own; admins see based on role).

**Response 200:**
```json
{
  "data": {
    "id": "app-uuid-...",
    "status": "WARD_REVIEW",
    "submission_reference": "TRK-2024-00142",
    "applicant": {
      "id": "user-uuid",
      "full_name": "Aisha Lokiru",
      "home_ward": "Kalokol"
    },
    "program": { "id": "...", "name": "..." },
    "amounts": {
      "total_fee_kes": 75000,
      "outstanding_balance": 60000,
      "amount_able_to_pay": 15000,
      "amount_requested": 45000,
      "amount_allocated": null
    },
    "helb_applied": true,
    "prior_bursary_received": false,
    "reason": "My mother is a single parent selling firewood...",
    "sections": {
      "A": { "complete": true, "data": { ... } },
      "B": { "complete": true, "data": { ... } },
      "C": { "complete": true, "data": { ... } },
      "D": { "complete": true, "data": { ... } },
      "E": { "complete": true, "data": { ... } }
    },
    "documents": [ ... ],
    "timeline": [ ... ],
    "submitted_at": "2024-08-10T14:23:00Z"
  }
}
```

---

### PATCH /applications/:id/sections/:section

Save a section of the application form (A | B | C | D | E).

**Access:** STUDENT (own draft application only)  
**Request:** Section-specific JSON payload.

**Example — Section B (Amounts):**
```json
{
  "total_fee_kes": 75000,
  "outstanding_balance": 60000,
  "amount_able_to_pay": 15000
}
```

**Example — Section C (Family):**
```json
{
  "family_status": "SINGLE_PARENT",
  "has_disability": false,
  "guardian_name": "Grace Lokiru",
  "guardian_occupation": "Petty trade",
  "guardian_contact": "+254700000000",
  "num_siblings": 4,
  "num_guardian_children": 5,
  "num_siblings_in_school": 2,
  "sibling_education_details": [
    {
      "name": "James Lokiru",
      "institution": "Lodwar High School",
      "year_class": "Form 3",
      "total_fees": 42000,
      "fee_paid": 15000,
      "outstanding": 27000
    }
  ]
}
```

**Response 200:**
```json
{
  "data": {
    "section": "C",
    "is_complete": true,
    "sections_complete": { "A": true, "B": true, "C": true, "D": false, "E": false }
  }
}
```

---

### POST /applications/:id/submit

Submit the completed application (all sections + documents must be complete).

**Access:** STUDENT  
**Rate limit:** 5/min per user  
**Request:** `{}` (no body — all data already saved via section endpoints)

**Validation:**
1. All sections A–E complete.
2. At least 1 document uploaded with `scan_status = 'CLEAN'`.
3. Program still open.
4. No existing approved/pending application for same program.

**Response 201:**
```json
{
  "data": {
    "id": "app-uuid-...",
    "status": "SUBMITTED",
    "submission_reference": "TRK-2024-00142",
    "submitted_at": "2024-08-10T14:23:00Z",
    "pdf_preview_url": "/applications/app-uuid/pdf?token=<signed>",
    "message": "Application submitted successfully. You will receive an SMS update."
  }
}
```

---

### GET /applications/:id/pdf

Generate or retrieve the application PDF.

**Access:** STUDENT (own), WARD_ADMIN, FINANCE_OFFICER, COUNTY_ADMIN  
**Query:** `?preview=true` (returns browser-renderable URL), `?download=true` (triggers download)

**Response 200:**
```json
{
  "data": {
    "url": "https://s3.../presigned-url...",
    "expires_at": "2024-08-10T15:23:00Z"
  }
}
```

---

### GET /ward/applications

List all applications in the ward admin's assigned ward(s).

**Access:** WARD_ADMIN, FINANCE_OFFICER, COUNTY_ADMIN  
**Query:** `?status=WARD_REVIEW&sort=score:desc&limit=20&cursor=...`

**Response 200:**
```json
{
  "data": [
    {
      "id": "app-uuid-...",
      "submission_reference": "TRK-2024-00142",
      "applicant_name": "Aisha Lokiru",
      "ward_name": "Kalokol",
      "institution_name": "University of Nairobi",
      "amount_requested": 45000,
      "status": "WARD_REVIEW",
      "ai_score": 78.5,
      "anomaly_flags": [],
      "submitted_at": "2024-08-10T14:23:00Z"
    }
  ],
  "pagination": { "total": 142, "hasMore": true, "nextCursor": "..." }
}
```

---

### GET /applications/:id/withdraw

Student withdraws their own DRAFT or SUBMITTED application.

**Access:** STUDENT  
**Response 200:** `{ "data": { "status": "WITHDRAWN" } }`

---

## 9. Document Endpoints

### POST /applications/:id/documents/presign

Request a presigned S3 upload URL for a document.

**Access:** STUDENT (own draft application)  
**Request:**
```json
{
  "doc_type": "FEE_STRUCTURE",
  "file_name": "fee-statement-2024.pdf",
  "content_type": "application/pdf",
  "file_size_bytes": 245000
}
```

**Validation:** content_type must be `application/pdf` or `image/jpeg` or `image/png`. Max 5 MB.

**Response 201:**
```json
{
  "data": {
    "document_id": "doc-uuid-...",
    "upload_url": "https://s3.amazonaws.com/...",
    "upload_expires_at": "2024-08-10T14:38:00Z",
    "fields": { "key": "counties/.../doc-uuid.pdf", ... }
  }
}
```

---

### POST /applications/:id/documents/:doc_id/confirm

Confirm upload complete (triggers virus scan job).

**Access:** STUDENT  
**Response 200:**
```json
{
  "data": {
    "document_id": "doc-uuid-...",
    "scan_status": "PENDING",
    "scan_eta_seconds": 30
  }
}
```

---

### GET /applications/:id/documents/:doc_id

Get document metadata and a presigned download URL.

**Access:** STUDENT (own), WARD_ADMIN, FINANCE_OFFICER, COUNTY_ADMIN

**Response 200:**
```json
{
  "data": {
    "id": "doc-uuid-...",
    "doc_type": "FEE_STRUCTURE",
    "original_name": "fee-statement-2024.pdf",
    "content_type": "application/pdf",
    "scan_status": "CLEAN",
    "uploaded_at": "2024-08-10T14:25:00Z",
    "download_url": "https://s3.amazonaws.com/...",
    "download_expires_at": "2024-08-10T14:40:00Z"
  }
}
```

---

### DELETE /applications/:id/documents/:doc_id

Delete a document (only on DRAFT applications).

**Access:** STUDENT  
**Response 204**

---

## 10. AI Score Endpoints

### GET /applications/:id/score

Get the AI score card for an application.

**Access:** WARD_ADMIN, FINANCE_OFFICER, COUNTY_ADMIN  
**Response 200:**
```json
{
  "data": {
    "application_id": "app-uuid-...",
    "total_score": 78.5,
    "grade": "HIGH",
    "dimensions": {
      "family_status": { "score": 25.0, "max": 25, "label": "Orphan — highest priority" },
      "family_income": { "score": 20.0, "max": 25, "label": "Income < KES 10,000/month" },
      "education_burden": { "score": 15.0, "max": 20, "label": "2 siblings in school" },
      "academic_standing": { "score": 10.5, "max": 15, "label": "University Year 2" },
      "document_quality": { "score": 8.0, "max": 10, "label": "All documents clear and complete" },
      "integrity": { "score": 0.0, "max": 5, "label": "No anomalies detected" }
    },
    "anomaly_flags": [],
    "document_analysis": {
      "FEE_STRUCTURE": { "quality_score": 9, "appears_authentic": true, "is_legible": true },
      "TRANSCRIPT": { "quality_score": 8, "appears_authentic": true, "is_legible": true }
    },
    "model_version": "v1.2.0",
    "scored_at": "2024-08-10T14:55:00Z"
  }
}
```

---

### GET /programs/:id/scores

Get ranked score list for all applications in a program (for committee view).

**Access:** WARD_ADMIN (own ward), FINANCE_OFFICER, COUNTY_ADMIN  
**Query:** `?ward_id=<uuid>&sort=total_score:desc&status=WARD_REVIEW`

**Response 200:** Paginated list of `{ application_id, submission_reference, applicant_name, total_score, status, amount_requested }`.

---

### PATCH /admin/scoring-weights

Update AI scoring dimension weights for the county.

**Access:** COUNTY_ADMIN  
**Request:**
```json
{
  "family_status": 0.30,
  "family_income": 0.25,
  "education_burden": 0.20,
  "academic_standing": 0.10,
  "document_quality": 0.10,
  "integrity": 0.05
}
```

**Validation:** All weights must sum to 1.0. No weight > 0.40.  
**Response 200:** `{ "data": { "weights_updated": true, "effective_from": "next cycle" } }`

---

## 11. Review Endpoints

### POST /applications/:id/review/ward

Ward admin submits a ward-level review.

**Access:** WARD_ADMIN  
**Request:**
```json
{
  "decision": "RECOMMENDED",
  "recommended_amount": 40000.00,
  "note": "Student is an orphan being raised by grandmother. High need confirmed."
}
```

**Decision values:** `RECOMMENDED | RETURNED | REJECTED`

**Validation:**
- `recommended_amount` ≤ `program.amount` (per-student max, if configured).
- Application must be in `WARD_REVIEW` status.
- Reviewer must be assigned to application's ward.

**Response 200:**
```json
{
  "data": {
    "review_id": "rev-uuid-...",
    "decision": "RECOMMENDED",
    "new_status": "COUNTY_REVIEW"
  }
}
```

---

### POST /applications/:id/review/county

Finance Officer submits the final allocation decision.

**Access:** FINANCE_OFFICER  
**Request:**
```json
{
  "decision": "APPROVED",
  "allocated_amount": 38000.00,
  "note": "Approved at reduced amount due to budget constraints."
}
```

**Decision values:** `APPROVED | REJECTED | WAITLISTED`

**Validation:**
- Advisory lock on program budget.
- `allocated_amount` must not cause `allocated_total > budget_ceiling`.
- Application must be in `COUNTY_REVIEW` status.

**Response 200:**
```json
{
  "data": {
    "review_id": "rev-uuid-...",
    "decision": "APPROVED",
    "allocated_amount": 38000.00,
    "new_status": "APPROVED",
    "budget_remaining": 2812000.00
  }
}
```

**Errors:**
- `409 BUDGET_EXHAUSTED` — allocation would exceed budget ceiling.

---

### GET /applications/:id/timeline

Get the full audit timeline for an application.

**Access:** STUDENT (own), WARD_ADMIN, FINANCE_OFFICER, COUNTY_ADMIN

**Response 200:**
```json
{
  "data": [
    {
      "event_type": "CREATED",
      "from_status": null,
      "to_status": "DRAFT",
      "actor": null,
      "occurred_at": "2024-08-09T10:00:00Z",
      "metadata": {}
    },
    {
      "event_type": "SUBMITTED",
      "from_status": "DRAFT",
      "to_status": "SUBMITTED",
      "actor": { "id": "...", "name": "Aisha Lokiru" },
      "occurred_at": "2024-08-10T14:23:00Z",
      "metadata": { "reference": "TRK-2024-00142" }
    },
    {
      "event_type": "AI_SCORED",
      "from_status": "SUBMITTED",
      "to_status": "WARD_REVIEW",
      "actor": null,
      "occurred_at": "2024-08-10T14:55:00Z",
      "metadata": { "score": 78.5, "model_version": "v1.2.0" }
    }
  ]
}
```

---

## 12. Disbursement Endpoints

### GET /disbursements

List disbursable applications (approved, not yet disbursed) for a program.

**Access:** FINANCE_OFFICER  
**Query:** `?program_id=<uuid>&method=MPESA_B2C`

---

### POST /disbursements/:application_id/mpesa

Trigger M-Pesa B2C disbursement for a single approved application.

**Access:** FINANCE_OFFICER  
**Request:**
```json
{
  "phone": "+254712345678",
  "amount_kes": 38000.00,
  "remarks": "Bursary disbursement TRK-2024-00142"
}
```

**Response 202 (Accepted — async):**
```json
{
  "data": {
    "disbursement_id": "disb-uuid-...",
    "status": "PENDING",
    "estimated_completion": "2024-08-15T10:05:00Z"
  }
}
```

---

### POST /disbursements/batch/eft

Generate an EFT/RTGS batch export file for multiple applications.

**Access:** FINANCE_OFFICER  
**Request:**
```json
{
  "program_id": "prog-uuid-...",
  "application_ids": ["app-uuid-1", "app-uuid-2", "..."]
}
```

**Response 200:**
```json
{
  "data": {
    "file_url": "https://s3.../eft-export-...",
    "expires_at": "2024-08-15T11:00:00Z",
    "total_amount_kes": 1450000.00,
    "record_count": 42
  }
}
```

---

### GET /disbursements/:id

Get disbursement status and details.

**Response 200:**
```json
{
  "data": {
    "id": "disb-uuid-...",
    "application_id": "app-uuid-...",
    "method": "MPESA_B2C",
    "amount_kes": 38000.00,
    "status": "SUCCESS",
    "transaction_id": "NKG6KL2H4Q",
    "confirmed_at": "2024-08-15T10:03:45Z",
    "receipt_url": "https://s3.../receipt.pdf"
  }
}
```

---

### POST /disbursements/:id/retry

Manually retry a failed disbursement.

**Access:** FINANCE_OFFICER  
**Response 202:** Disbursement re-enqueued.

---

## 13. Reporting Endpoints

### GET /reports/dashboard

Real-time dashboard summary for the authenticated county.

**Access:** WARD_ADMIN, FINANCE_OFFICER, COUNTY_ADMIN

**Response 200:**
```json
{
  "data": {
    "as_of": "2024-08-15T10:00:00Z",
    "programs": [
      {
        "id": "prog-uuid-...",
        "name": "2024 Ward Bursary",
        "budget_ceiling": 5000000,
        "allocated_total": 2150000,
        "disbursed_total": 1800000,
        "utilization_pct": 43.0,
        "applications_by_status": {
          "DRAFT": 23,
          "SUBMITTED": 45,
          "WARD_REVIEW": 312,
          "COUNTY_REVIEW": 89,
          "APPROVED": 245,
          "REJECTED": 67,
          "DISBURSED": 180
        }
      }
    ],
    "ward_breakdown": [
      { "ward_name": "Kalokol", "applications": 142, "approved": 45, "allocated_kes": 1800000 }
    ]
  }
}
```

---

### GET /reports/applications/export

Export application data as Excel or CSV.

**Access:** WARD_ADMIN (ward scope), FINANCE_OFFICER, COUNTY_ADMIN  
**Query:** `?program_id=<uuid>&ward_id=<uuid>&status=APPROVED&format=xlsx`

**Response 200:** File download (Content-Disposition: attachment).

---

### GET /reports/ocob

Generate OCOB-format financial report.

**Access:** FINANCE_OFFICER, COUNTY_ADMIN  
**Query:** `?program_id=<uuid>&format=xlsx`

**Response 200:** Excel file structured per OCOB reporting template.

---

## 14. Admin / Tenant Endpoints

### GET /admin/settings

Get county configuration (branding, scoring weights, contact info).

**Access:** COUNTY_ADMIN

---

### PATCH /admin/settings

Update county settings.

**Access:** COUNTY_ADMIN  
**Request:**
```json
{
  "fund_name": "Turkana County Education Fund",
  "legal_reference": "No. 4 of 2023",
  "primary_color": "#1E3A5F"
}
```

---

### POST /admin/settings/logo

Upload county logo (multipart form, or returns presign URL for direct S3 upload).

**Access:** COUNTY_ADMIN  
**Response 200:** `{ "data": { "logo_url": "https://cdn.../logo.png" } }`

---

### GET /admin/wards

List all wards in the county.

**Access:** COUNTY_ADMIN

---

### POST /admin/users

Create a new admin user (ward admin, finance officer, county admin).

**Access:** COUNTY_ADMIN  
**Request:**
```json
{
  "email": "james.admin@turkana.go.ke",
  "role": "WARD_ADMIN",
  "ward_id": "ward-uuid-...",
  "full_name": "James Erot"
}
```

**Response 201:** User created; welcome email with temporary password dispatched.

---

### GET /admin/users

List county admin and staff users.

**Access:** COUNTY_ADMIN

---

### PATCH /admin/users/:id

Update user role, ward assignment, or active status.

**Access:** COUNTY_ADMIN

---

## 15. Internal Endpoints

*These endpoints are not exposed via the API gateway. They are accessible only within the VPC from the AI Scoring Service.*

### POST /internal/ai-scores (write score card from AI service)

**Auth:** Service API key header `X-Service-Key`  
**Request:** Full score card object.  
**Response 201:** Score card created.

### GET /internal/applications/:id (AI service reads application data)

**Auth:** Service API key  
**Response 200:** Full application + sections + documents (for AI analysis).

---

## 16. Rate Limiting

All rate limits are enforced per user (authenticated) or per IP (unauthenticated).

| Endpoint Group | Limit | Window |
|----------------|-------|--------|
| POST /auth/login | 10 | 1 minute |
| POST /auth/register | 10 | 1 minute |
| POST /auth/send-phone-otp | 5 | 1 minute |
| POST /applications/:id/submit | 5 | 1 minute |
| POST /disbursements/*/mpesa | 30 | 1 minute |
| GET /reports/* | 10 | 1 minute |
| All other authenticated | 200 | 1 minute |

**Rate limit response headers:**
```
X-RateLimit-Limit: 200
X-RateLimit-Remaining: 187
X-RateLimit-Reset: 1723716060
```

---

## 17. Versioning & Deprecation

### Strategy: URI Versioning

`/api/v1/...` is the current stable version. Version is in the path (not header) for clarity and cache-friendliness.

### Backward Compatibility Rules

- Adding new optional fields to responses: backward compatible, no version bump.
- Adding new optional query params: backward compatible.
- Removing fields or changing field semantics: requires a new version (`/api/v2/...`).
- Old version continues to operate for minimum 12 months after deprecation announcement.

### Deprecation Process

1. Announce deprecation in API changelog and developer email.
2. Add `Deprecation: true` and `Sunset: <date>` response headers to deprecated endpoints.
3. Run for 12-month deprecation window.
4. Disable deprecated version.

### Changelog

```
v1.0.0 (2024-08) — Initial release
```