/**
 * Purpose: Seed AI scorecards, documents, disbursements, and notification audit records.
 * Why important: Review, disbursement, and reporting screens require these linked artifacts.
 * Used by: Prisma seed entrypoint after workflow seeding.
 */
import { DisbursementMethod, DisbursementStatus, NotificationChannel, NotificationDeliveryStatus, PrismaClient } from '@prisma/client';

import { ApplicationContext, ProgramContext, SeedContext } from './seed-types';

export async function seedArtifacts(
  prisma: PrismaClient,
  seed: SeedContext,
  programs: ProgramContext,
  apps: ApplicationContext,
): Promise<void> {
  for (const score of buildScores(seed, apps)) {
    await prisma.aIScoreCard.upsert({
      where: { applicationId: score.applicationId },
      update: score,
      create: score,
    });
  }

  for (const doc of buildDocuments(seed, apps)) {
    await prisma.document.upsert({
      where: { id: doc.id },
      update: doc,
      create: doc,
    });
  }

  for (const row of [
    {
      applicationId: apps.eveDisbursed,
      countyId: seed.county.turkana,
      programId: programs.main,
      disbursementMethod: DisbursementMethod.MPESA_B2C,
      amountKes: 50000,
      recipientPhone: '+254700020005',
      transactionId: 'MPESA-TURK-50001',
      status: DisbursementStatus.SUCCESS,
      initiatedBy: seed.users.financeOfficer,
      initiatedAt: new Date('2026-02-19T09:00:00.000Z'),
      confirmedAt: new Date('2026-02-20T12:20:00.000Z'),
    },
    {
      applicationId: apps.hanaLegacy,
      countyId: seed.county.turkana,
      programId: programs.legacy,
      disbursementMethod: DisbursementMethod.BANK_EFT,
      amountKes: 28000,
      recipientPhone: '+254700020008',
      transactionId: 'EFT-TURK-28008',
      status: DisbursementStatus.SUCCESS,
      initiatedBy: seed.users.financeOfficer,
      initiatedAt: new Date('2025-05-05T09:00:00.000Z'),
      confirmedAt: new Date('2025-05-06T10:00:00.000Z'),
    },
  ]) {
    await prisma.disbursementRecord.upsert({
      where: { applicationId: row.applicationId },
      update: row,
      create: row,
    });
  }

  for (const notification of buildNotifications(seed, apps)) {
    await prisma.notificationDelivery.upsert({
      where: { id: notification.id },
      update: notification,
      create: notification,
    });
  }
}

function buildScores(seed: SeedContext, apps: ApplicationContext) {
  const rows = [
    ['aishaSubmitted', 62.5],
    ['brianWard', 88.3],
    ['carolCounty', 79.6],
    ['danApproved', 72.2],
    ['eveDisbursed', 84.1],
    ['fatmaRejected', 43.7],
    ['gideonWaitlist', 69.8],
    ['hanaLegacy', 75.4],
  ] as const;

  return rows.map(([appKey, total]) => ({
    applicationId: apps[appKey],
    countyId: seed.county.turkana,
    totalScore: total,
    familyStatusScore: Number((total * 0.25).toFixed(2)),
    familyIncomeScore: Number((total * 0.22).toFixed(2)),
    educationBurdenScore: Number((total * 0.2).toFixed(2)),
    academicStandingScore: Number((total * 0.13).toFixed(2)),
    documentQualityScore: Number((total * 0.12).toFixed(2)),
    integrityScore: Number((total * 0.08).toFixed(2)),
    anomalyFlags: total < 50 ? ['LOW_SCORE_FLAG'] : [],
    documentAnalysis: { confidence: 0.91, completeness: total > 60 ? 'GOOD' : 'PARTIAL' },
    modelVersion: 'seed-model-v1',
    weightsApplied: { family_status: 0.25, family_income: 0.25, education_burden: 0.2, academic_standing: 0.1, document_quality: 0.1, integrity: 0.1 },
    scoredAt: new Date('2026-03-02T08:00:00.000Z'),
  }));
}

function buildDocuments(seed: SeedContext, apps: ApplicationContext) {
  return [
    { id: '7c50ec82-6d98-4306-abaf-52a4aa6f4001', applicationId: apps.brianWard, countyId: seed.county.turkana, docType: 'NATIONAL_ID', s3Key: 'documents/brian-id.pdf', originalName: 'brian-national-id.pdf', contentType: 'application/pdf', fileSizeBytes: 120432, scanStatus: 'CLEAN' as const },
    { id: '7c50ec82-6d98-4306-abaf-52a4aa6f4002', applicationId: apps.brianWard, countyId: seed.county.turkana, docType: 'FEE_STRUCTURE', s3Key: 'documents/brian-fee.pdf', originalName: 'brian-fee-structure.pdf', contentType: 'application/pdf', fileSizeBytes: 98231, scanStatus: 'CLEAN' as const },
    { id: '7c50ec82-6d98-4306-abaf-52a4aa6f4003', applicationId: apps.carolCounty, countyId: seed.county.turkana, docType: 'ADMISSION_LETTER', s3Key: 'documents/carol-admission.pdf', originalName: 'carol-admission-letter.pdf', contentType: 'application/pdf', fileSizeBytes: 112222, scanStatus: 'CLEAN' as const },
    { id: '7c50ec82-6d98-4306-abaf-52a4aa6f4004', applicationId: apps.danApproved, countyId: seed.county.turkana, docType: 'BANK_DETAILS', s3Key: 'documents/dan-bank.pdf', originalName: 'dan-bank-details.pdf', contentType: 'application/pdf', fileSizeBytes: 104231, scanStatus: 'CLEAN' as const },
  ];
}

function buildNotifications(seed: SeedContext, apps: ApplicationContext) {
  return [
    {
      id: '6ae9d4ad-5410-4211-8563-e1119e374501',
      countyId: seed.county.turkana,
      applicationId: apps.aishaSubmitted,
      recipientUserId: seed.users.aisha,
      channel: NotificationChannel.SMS,
      eventType: 'APPLICATION_SUBMITTED',
      recipientPhone: '+254700020001',
      messageText: 'Dear Aisha Nareto, your bursary application APP-TURK-1001 was submitted successfully.',
      status: NotificationDeliveryStatus.SENT,
      attemptCount: 1,
      queueJobId: 'seed-notification-1',
      providerMessageId: 'sms-seed-1',
      queuedAt: new Date('2026-03-05T09:00:10.000Z'),
      sentAt: new Date('2026-03-05T09:00:15.000Z'),
      metadata: { fromStatus: 'DRAFT', toStatus: 'SUBMITTED' },
    },
    {
      id: '6ae9d4ad-5410-4211-8563-e1119e374502',
      countyId: seed.county.turkana,
      applicationId: apps.danApproved,
      recipientUserId: seed.users.dan,
      channel: NotificationChannel.SMS,
      eventType: 'COUNTY_REVIEW_APPROVED',
      recipientPhone: '+254700020004',
      messageText: 'Dear Daniel Lokwang, application APP-TURK-1004 has been approved by the county bursary office.',
      status: NotificationDeliveryStatus.SENT,
      attemptCount: 1,
      queueJobId: 'seed-notification-2',
      providerMessageId: 'sms-seed-2',
      queuedAt: new Date('2026-02-25T12:06:00.000Z'),
      sentAt: new Date('2026-02-25T12:06:06.000Z'),
      metadata: { fromStatus: 'COUNTY_REVIEW', toStatus: 'APPROVED' },
    },
  ];
}
