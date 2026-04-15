-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'WARD_ADMIN', 'FINANCE_OFFICER', 'COUNTY_ADMIN', 'PLATFORM_OPERATOR');

-- CreateEnum
CREATE TYPE "ProgramStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'WARD_REVIEW', 'COUNTY_REVIEW', 'APPROVED', 'REJECTED', 'WAITLISTED', 'DISBURSED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ReviewStage" AS ENUM ('WARD_REVIEW', 'COUNTY_REVIEW');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('RECOMMENDED', 'RETURNED', 'REJECTED', 'APPROVED', 'WAITLISTED');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('PENDING', 'CLEAN', 'INFECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "DisbursementMethod" AS ENUM ('MPESA_B2C', 'BANK_EFT', 'CHEQUE');

-- CreateEnum
CREATE TYPE "DisbursementStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REVERSED');

-- CreateTable
CREATE TABLE "counties" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(60) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "fund_name" VARCHAR(180),
    "legal_reference" VARCHAR(180),
    "logo_s3_key" TEXT,
    "primary_color" VARCHAR(7) NOT NULL DEFAULT '#1E3A5F',
    "plan_tier" VARCHAR(30) NOT NULL DEFAULT 'BASIC',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "counties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wards" (
    "id" UUID NOT NULL,
    "county_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "code" VARCHAR(20),
    "sub_county" VARCHAR(120),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "county_id" UUID NOT NULL,
    "ward_id" UUID,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verify_token" VARCHAR(255),
    "email_verify_expiry" TIMESTAMPTZ(6),
    "reset_token" VARCHAR(255),
    "reset_expiry" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "county_id" UUID NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "national_id" BYTEA,
    "date_of_birth" DATE,
    "gender" VARCHAR(10),
    "home_ward" VARCHAR(120),
    "village_unit" VARCHAR(120),
    "phone" VARCHAR(20),
    "profile_complete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_info" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "county_id" UUID NOT NULL,
    "institution_type" VARCHAR(30),
    "institution_name" VARCHAR(255),
    "year_form_class" VARCHAR(20),
    "admission_number" VARCHAR(60),
    "course_name" VARCHAR(255),
    "bank_account_name" VARCHAR(255),
    "bank_account_number" BYTEA,
    "bank_name" VARCHAR(120),
    "bank_branch" VARCHAR(120),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "academic_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_financial_info" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "county_id" UUID NOT NULL,
    "family_status" VARCHAR(30),
    "has_disability" BOOLEAN NOT NULL DEFAULT false,
    "disability_details" TEXT,
    "guardian_name" VARCHAR(255),
    "guardian_occupation" VARCHAR(120),
    "guardian_contact" VARCHAR(20),
    "num_siblings" INTEGER,
    "num_guardian_children" INTEGER,
    "num_siblings_in_school" INTEGER,
    "father_occupation" VARCHAR(120),
    "father_income_kes" INTEGER,
    "mother_occupation" VARCHAR(120),
    "mother_income_kes" INTEGER,
    "guardian_income_kes" INTEGER,
    "sibling_education_details" JSONB NOT NULL DEFAULT '[]',
    "orphan_sponsor_name" VARCHAR(255),
    "orphan_sponsor_relation" VARCHAR(60),
    "orphan_sponsor_contact" VARCHAR(20),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "family_financial_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bursary_programs" (
    "id" UUID NOT NULL,
    "county_id" UUID NOT NULL,
    "ward_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "budget_ceiling" DECIMAL(15,2) NOT NULL,
    "allocated_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "disbursed_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "opens_at" TIMESTAMPTZ(6) NOT NULL,
    "closes_at" TIMESTAMPTZ(6) NOT NULL,
    "academic_year" VARCHAR(10),
    "status" "ProgramStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bursary_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eligibility_rules" (
    "id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "county_id" UUID NOT NULL,
    "rule_type" VARCHAR(50) NOT NULL,
    "parameters" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eligibility_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL,
    "county_id" UUID NOT NULL,
    "applicant_id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "ward_id" UUID NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "total_fee_kes" DECIMAL(12,2),
    "outstanding_balance" DECIMAL(12,2),
    "amount_able_to_pay" DECIMAL(12,2),
    "amount_requested" DECIMAL(12,2),
    "amount_allocated" DECIMAL(12,2),
    "helb_applied" BOOLEAN,
    "prior_bursary_received" BOOLEAN NOT NULL DEFAULT false,
    "prior_bursary_source" VARCHAR(255),
    "prior_bursary_amount" DECIMAL(12,2),
    "reason" TEXT,
    "submission_reference" VARCHAR(30),
    "pdf_s3_key" TEXT,
    "submitted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_sections" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "county_id" UUID NOT NULL,
    "section_key" VARCHAR(20) NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "is_complete" BOOLEAN NOT NULL DEFAULT false,
    "saved_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "county_id" UUID NOT NULL,
    "doc_type" VARCHAR(50) NOT NULL,
    "s3_key" TEXT NOT NULL,
    "original_name" VARCHAR(255),
    "content_type" VARCHAR(80),
    "file_size_bytes" INTEGER,
    "scan_status" "ScanStatus" NOT NULL DEFAULT 'PENDING',
    "scan_completed_at" TIMESTAMPTZ(6),
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_reviews" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "county_id" UUID NOT NULL,
    "reviewer_id" UUID NOT NULL,
    "stage" "ReviewStage" NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "recommended_amount" DECIMAL(12,2),
    "allocated_amount" DECIMAL(12,2),
    "note" TEXT,
    "reviewed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_timeline" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "county_id" UUID NOT NULL,
    "actor_id" UUID,
    "event_type" VARCHAR(50) NOT NULL,
    "from_status" VARCHAR(30),
    "to_status" VARCHAR(30),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_score_cards" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "county_id" UUID NOT NULL,
    "total_score" DECIMAL(5,2) NOT NULL,
    "family_status_score" DECIMAL(5,2),
    "family_income_score" DECIMAL(5,2),
    "education_burden_score" DECIMAL(5,2),
    "academic_standing_score" DECIMAL(5,2),
    "document_quality_score" DECIMAL(5,2),
    "integrity_score" DECIMAL(5,2),
    "anomaly_flags" JSONB NOT NULL DEFAULT '[]',
    "document_analysis" JSONB NOT NULL DEFAULT '{}',
    "model_version" VARCHAR(30),
    "weights_applied" JSONB NOT NULL,
    "scored_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_score_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disbursement_records" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "county_id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "disbursement_method" "DisbursementMethod" NOT NULL,
    "amount_kes" DECIMAL(12,2) NOT NULL,
    "recipient_phone" VARCHAR(20),
    "recipient_bank_account" BYTEA,
    "recipient_bank_name" VARCHAR(120),
    "transaction_id" VARCHAR(120),
    "status" "DisbursementStatus" NOT NULL DEFAULT 'PENDING',
    "failure_reason" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "initiated_by" UUID NOT NULL,
    "initiated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMPTZ(6),
    "receipt_s3_key" TEXT,

    CONSTRAINT "disbursement_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "counties_slug_key" ON "counties"("slug");

-- CreateIndex
CREATE INDEX "idx_wards_county" ON "wards"("county_id");

-- CreateIndex
CREATE UNIQUE INDEX "wards_county_id_code_key" ON "wards"("county_id", "code");

-- CreateIndex
CREATE INDEX "idx_users_county" ON "users"("county_id");

-- CreateIndex
CREATE INDEX "idx_users_county_role" ON "users"("county_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_county_id_key" ON "users"("email", "county_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_user_id_key" ON "student_profiles"("user_id");

-- CreateIndex
CREATE INDEX "idx_profile_county" ON "student_profiles"("county_id");

-- CreateIndex
CREATE UNIQUE INDEX "academic_info_user_id_key" ON "academic_info"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "family_financial_info_user_id_key" ON "family_financial_info"("user_id");

-- CreateIndex
CREATE INDEX "idx_programs_county" ON "bursary_programs"("county_id");

-- CreateIndex
CREATE INDEX "idx_programs_county_status" ON "bursary_programs"("county_id", "status");

-- CreateIndex
CREATE INDEX "idx_eligibility_program" ON "eligibility_rules"("program_id");

-- CreateIndex
CREATE UNIQUE INDEX "applications_submission_reference_key" ON "applications"("submission_reference");

-- CreateIndex
CREATE INDEX "idx_applications_county" ON "applications"("county_id");

-- CreateIndex
CREATE INDEX "idx_applications_county_status" ON "applications"("county_id", "status");

-- CreateIndex
CREATE INDEX "idx_applications_county_ward" ON "applications"("county_id", "ward_id");

-- CreateIndex
CREATE INDEX "idx_applications_program" ON "applications"("program_id");

-- CreateIndex
CREATE INDEX "idx_applications_applicant" ON "applications"("applicant_id");

-- CreateIndex
CREATE UNIQUE INDEX "idx_applications_no_duplicate" ON "applications"("applicant_id", "program_id");

-- CreateIndex
CREATE INDEX "idx_sections_application" ON "application_sections"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "application_sections_application_id_section_key_key" ON "application_sections"("application_id", "section_key");

-- CreateIndex
CREATE INDEX "idx_documents_application" ON "documents"("application_id", "county_id");

-- CreateIndex
CREATE INDEX "idx_documents_scan_pending" ON "documents"("scan_status");

-- CreateIndex
CREATE INDEX "idx_reviews_application" ON "application_reviews"("application_id");

-- CreateIndex
CREATE INDEX "idx_reviews_county_stage" ON "application_reviews"("county_id", "stage");

-- CreateIndex
CREATE INDEX "idx_timeline_application" ON "application_timeline"("application_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "idx_timeline_county_date" ON "application_timeline"("county_id", "occurred_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ai_score_cards_application_id_key" ON "ai_score_cards"("application_id");

-- CreateIndex
CREATE INDEX "idx_scores_county" ON "ai_score_cards"("county_id");

-- CreateIndex
CREATE INDEX "idx_scores_total" ON "ai_score_cards"("county_id", "total_score" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "disbursement_records_application_id_key" ON "disbursement_records"("application_id");

-- CreateIndex
CREATE INDEX "idx_disbursement_application" ON "disbursement_records"("application_id");

-- CreateIndex
CREATE INDEX "idx_disbursement_county_status" ON "disbursement_records"("county_id", "status");

-- CreateIndex
CREATE INDEX "idx_disbursement_pending" ON "disbursement_records"("status", "retry_count");

-- AddForeignKey
ALTER TABLE "wards" ADD CONSTRAINT "wards_county_id_fkey" FOREIGN KEY ("county_id") REFERENCES "counties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_county_id_fkey" FOREIGN KEY ("county_id") REFERENCES "counties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_ward_id_fkey" FOREIGN KEY ("ward_id") REFERENCES "wards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_county_id_fkey" FOREIGN KEY ("county_id") REFERENCES "counties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_info" ADD CONSTRAINT "academic_info_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_info" ADD CONSTRAINT "academic_info_county_id_fkey" FOREIGN KEY ("county_id") REFERENCES "counties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_financial_info" ADD CONSTRAINT "family_financial_info_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_financial_info" ADD CONSTRAINT "family_financial_info_county_id_fkey" FOREIGN KEY ("county_id") REFERENCES "counties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bursary_programs" ADD CONSTRAINT "bursary_programs_county_id_fkey" FOREIGN KEY ("county_id") REFERENCES "counties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bursary_programs" ADD CONSTRAINT "bursary_programs_ward_id_fkey" FOREIGN KEY ("ward_id") REFERENCES "wards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bursary_programs" ADD CONSTRAINT "bursary_programs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eligibility_rules" ADD CONSTRAINT "eligibility_rules_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "bursary_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eligibility_rules" ADD CONSTRAINT "eligibility_rules_county_id_fkey" FOREIGN KEY ("county_id") REFERENCES "counties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_county_id_fkey" FOREIGN KEY ("county_id") REFERENCES "counties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "bursary_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_ward_id_fkey" FOREIGN KEY ("ward_id") REFERENCES "wards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_sections" ADD CONSTRAINT "application_sections_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_sections" ADD CONSTRAINT "application_sections_county_id_fkey" FOREIGN KEY ("county_id") REFERENCES "counties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_county_id_fkey" FOREIGN KEY ("county_id") REFERENCES "counties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_reviews" ADD CONSTRAINT "application_reviews_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_reviews" ADD CONSTRAINT "application_reviews_county_id_fkey" FOREIGN KEY ("county_id") REFERENCES "counties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_reviews" ADD CONSTRAINT "application_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_timeline" ADD CONSTRAINT "application_timeline_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_timeline" ADD CONSTRAINT "application_timeline_county_id_fkey" FOREIGN KEY ("county_id") REFERENCES "counties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_timeline" ADD CONSTRAINT "application_timeline_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_score_cards" ADD CONSTRAINT "ai_score_cards_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_score_cards" ADD CONSTRAINT "ai_score_cards_county_id_fkey" FOREIGN KEY ("county_id") REFERENCES "counties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disbursement_records" ADD CONSTRAINT "disbursement_records_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disbursement_records" ADD CONSTRAINT "disbursement_records_county_id_fkey" FOREIGN KEY ("county_id") REFERENCES "counties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disbursement_records" ADD CONSTRAINT "disbursement_records_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "bursary_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disbursement_records" ADD CONSTRAINT "disbursement_records_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
