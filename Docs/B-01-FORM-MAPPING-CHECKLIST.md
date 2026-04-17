# B-01 Form Mapping Checklist

Status: Implemented in code
Last Updated: 2026-04-17
Source Reference: Docs/Education-Fund-Application-Form.pdf (scanned PDF; no machine-readable text layer)

## Notes

- Automated extraction of field labels from the PDF is not possible because the file is image-only.
- Mapping below is validated against the known section structure in PRD IDs SP-02 and AF-01 and the live wizard/API payload contracts.

## Section Mapping

| Official Form Section | Required Field Group | Web Capture Surface | API Contract Surface | Status |
|---|---|---|---|---|
| A - Personal | Applicant identity and student profile | apps/web/app/(student)/apply/[programId]/section-a/page.tsx | apps/api/modules/application/dto/section-a.dto.ts | Implemented |
| B - Amounts | Requested amount, fee balances, HELB, prior bursary | apps/web/app/(student)/apply/[programId]/section-b/page.tsx | apps/api/modules/application/dto/section-b.dto.ts | Implemented |
| C - Family | Family status, guardian details, sibling burden | apps/web/app/(student)/apply/[programId]/section-c/page.tsx | apps/api/modules/application/dto/section-c.dto.ts | Implemented |
| D - Financial Status | Household income and hardship narrative | apps/web/app/(student)/apply/[programId]/section-d/page.tsx | apps/api/modules/application/dto/section-d.dto.ts | Implemented |
| E - Other Disclosures | Disability/other support disclosures and declarations | apps/web/app/(student)/apply/[programId]/section-e/page.tsx | apps/api/modules/application/dto/section-e.dto.ts | Implemented |
| F - Supporting Attachments | Uploaded document metadata and notes | apps/web/app/(student)/apply/[programId]/section-f/page.tsx | apps/api/modules/application/dto/section-f.dto.ts | Implemented |

## Required SP-04 Data Points

| SP-04 Requirement | Captured In | Persisted In |
|---|---|---|
| Family status (both parents/single parent/orphan/disability) | section-c payload | application_sections.section_key = section-c |
| Guardian income (father/mother/guardian KES context) | section-d payload | application_sections.section_key = section-d |
| Sibling education burden | section-c payload | application_sections.section_key = section-c |
| HELB status | section-b payload | application_sections.section_key = section-b and applications.helb_applied |
| Prior bursary disclosure | section-b payload | application_sections.section_key = section-b and applications.prior_bursary_* |

## Duplicate Semantics Check (AF-05)

- Duplicate create draft for same student + program now returns 409 with code DUPLICATE_APPLICATION.
- Behavior is covered by integration test: apps/api/test/integration/student-application.e2e-spec.ts.
