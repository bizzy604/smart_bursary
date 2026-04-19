/**
 * Purpose: Seed application workflow records including sections, reviews, and timeline events.
 * Why important: Review queues, student history, and status widgets rely on realistic workflow state.
 * Used by: Prisma seed entrypoint after foundation/program seeding.
 */
import { Prisma, PrismaClient } from '@prisma/client';

import { ApplicationContext, ProgramContext, SeedContext } from './seed-types';

type AppKey = keyof ApplicationContext;
type UserKey = keyof SeedContext['users'];
type ProgramKey = keyof ProgramContext;
type WardKey = keyof SeedContext['wards'];

const APP_ROWS: Array<{
  key: AppKey; applicant: UserKey; program: ProgramKey; ward: WardKey; status: string; ref: string | null;
  submittedAt: string | null; amountRequested: number; amountAllocated: number | null; reason: string;
}> = [
  { key: 'aishaSubmitted', applicant: 'aisha', program: 'main', ward: 'lodwar', status: 'SUBMITTED', ref: 'APP-TURK-1001', submittedAt: '2026-03-05T09:00:00.000Z', amountRequested: 45000, amountAllocated: null, reason: 'Tuition support for second year fees.' },
  { key: 'aishaDraft', applicant: 'aisha', program: 'ward', ward: 'lodwar', status: 'DRAFT', ref: null, submittedAt: null, amountRequested: 38000, amountAllocated: null, reason: 'Draft request for ward talent support.' },
  { key: 'brianWard', applicant: 'brian', program: 'main', ward: 'lodwar', status: 'WARD_REVIEW', ref: 'APP-TURK-1002', submittedAt: '2026-03-01T09:00:00.000Z', amountRequested: 60000, amountAllocated: null, reason: 'Needs tuition and hostel support.' },
  { key: 'carolCounty', applicant: 'carol', program: 'main', ward: 'kanamkemer', status: 'COUNTY_REVIEW', ref: 'APP-TURK-1003', submittedAt: '2026-02-27T09:00:00.000Z', amountRequested: 55000, amountAllocated: null, reason: 'TVET training and tools support.' },
  { key: 'danApproved', applicant: 'dan', program: 'main', ward: 'lodwar', status: 'APPROVED', ref: 'APP-TURK-1004', submittedAt: '2026-02-18T09:00:00.000Z', amountRequested: 50000, amountAllocated: 35000, reason: 'Semester tuition balance support.' },
  { key: 'eveDisbursed', applicant: 'eve', program: 'main', ward: 'kakuma', status: 'DISBURSED', ref: 'APP-TURK-1005', submittedAt: '2026-02-10T09:00:00.000Z', amountRequested: 65000, amountAllocated: 50000, reason: 'Final year tuition clearance.' },
  { key: 'fatmaRejected', applicant: 'fatma', program: 'main', ward: 'kanamkemer', status: 'REJECTED', ref: 'APP-TURK-1006', submittedAt: '2026-02-13T09:00:00.000Z', amountRequested: 30000, amountAllocated: null, reason: 'Partial support request.' },
  { key: 'gideonWaitlist', applicant: 'gideon', program: 'main', ward: 'kakuma', status: 'WAITLISTED', ref: 'APP-TURK-1007', submittedAt: '2026-02-22T09:00:00.000Z', amountRequested: 42000, amountAllocated: null, reason: 'Awaiting budget headroom for intake.' },
  { key: 'hanaLegacy', applicant: 'hana', program: 'legacy', ward: 'kakuma', status: 'DISBURSED', ref: 'APP-TURK-0908', submittedAt: '2025-04-11T09:00:00.000Z', amountRequested: 32000, amountAllocated: 28000, reason: 'Legacy cycle disbursement record.' },
];

export async function seedWorkflow(
  prisma: PrismaClient,
  seed: SeedContext,
  programs: ProgramContext,
): Promise<ApplicationContext> {
  const appIds = {} as ApplicationContext;
  for (const row of APP_ROWS) {
    const saved = await prisma.application.upsert({
      where: { applicantId_programId: { applicantId: seed.users[row.applicant], programId: programs[row.program] } },
      update: {
        countyId: seed.county.turkana,
        wardId: seed.wards[row.ward],
        status: row.status as never,
        totalFeeKes: 120000,
        outstandingBalance: 90000,
        amountRequested: row.amountRequested,
        amountAllocated: row.amountAllocated,
        reason: row.reason,
        submissionReference: row.ref,
        submittedAt: row.submittedAt ? new Date(row.submittedAt) : null,
      },
      create: {
        countyId: seed.county.turkana,
        applicantId: seed.users[row.applicant],
        programId: programs[row.program],
        wardId: seed.wards[row.ward],
        status: row.status as never,
        totalFeeKes: 120000,
        outstandingBalance: 90000,
        amountRequested: row.amountRequested,
        amountAllocated: row.amountAllocated,
        reason: row.reason,
        submissionReference: row.ref,
        submittedAt: row.submittedAt ? new Date(row.submittedAt) : null,
      },
      select: { id: true },
    });
    appIds[row.key] = saved.id;
  }

  for (const section of buildStudentSections()) {
    await prisma.applicationSection.upsert({
      where: { applicationId_sectionKey: { applicationId: appIds[section.app], sectionKey: section.sectionKey } },
      update: { countyId: seed.county.turkana, data: section.data, isComplete: section.isComplete, savedAt: new Date(section.savedAt) },
      create: { applicationId: appIds[section.app], countyId: seed.county.turkana, sectionKey: section.sectionKey, data: section.data, isComplete: section.isComplete, savedAt: new Date(section.savedAt) },
    });
  }

  for (const review of buildReviews(seed, appIds)) {
    await prisma.applicationReview.upsert({
      where: { id: review.id },
      update: review,
      create: review,
    });
  }

  for (const event of buildTimeline(seed, appIds)) {
    await prisma.applicationTimeline.upsert({
      where: { id: event.id },
      update: event,
      create: event,
    });
  }

  return appIds;
}

function buildStudentSections() {
  const base = {
    'section-a': { fullName: 'Aisha Nareto', phone: '+254700020001', institution: 'Turkana Technical University', course: 'BSc Information Systems', yearOfStudy: 'Year 2' },
    'section-b': { requestedKes: 45000, feeBalanceKes: 90000, totalFeeKes: 120000, helbApplied: true, helbAmountKes: 30000, priorBursaryReceived: false, reasonForSupport: 'Need tuition support.' },
    'section-c': { familyStatus: 'NEEDY', guardianName: 'Nareto Lokiru', guardianPhone: '+254700020001', householdSize: 6, dependantsInSchool: 3, siblings: [] },
    'section-d': { income: { fatherOccupation: 'Pastoralist', fatherMonthlyIncomeKes: 10000, motherOccupation: 'Trader', motherMonthlyIncomeKes: 7000 }, hardshipNarrative: 'Family income cannot cover all school expenses.' },
    'section-e': { hasOtherBursary: false, hasDisabilityNeeds: false, declarationName: 'Aisha Nareto', confirmTruth: true, authorizeVerification: true, acceptPrivacyPolicy: true },
    'section-f': { documents: [{ type: 'NATIONAL_ID', label: 'National ID', fileName: 'aisha-id.pdf' }, { type: 'FEE_STRUCTURE', label: 'Fee Structure', fileName: 'aisha-fee.pdf' }], additionalNotes: 'All mandatory uploads attached.' },
  } as const;

  const rows: Array<{ app: AppKey; sectionKey: string; data: Prisma.InputJsonValue; isComplete: boolean; savedAt: string }> = [];
  for (const app of ['aishaSubmitted', 'aishaDraft'] as const) {
    for (const [sectionKey, data] of Object.entries(base)) {
      rows.push({ app, sectionKey, data, isComplete: app === 'aishaSubmitted' ? true : sectionKey !== 'section-f', savedAt: app === 'aishaSubmitted' ? '2026-03-05T10:00:00.000Z' : '2026-03-11T10:00:00.000Z' });
    }
  }
  return rows;
}

function buildReviews(seed: SeedContext, appIds: ApplicationContext) {
  return [
    { id: 'f0eeb03c-aa9f-4f55-988f-70c3808c3001', applicationId: appIds.carolCounty, countyId: seed.county.turkana, reviewerId: seed.users.wardAdmin, stage: 'WARD_REVIEW' as never, decision: 'RECOMMENDED' as never, recommendedAmount: 40000, note: 'Household income verified and recommendation approved at ward.', reviewedAt: new Date('2026-03-03T12:00:00.000Z') },
    { id: 'f0eeb03c-aa9f-4f55-988f-70c3808c3002', applicationId: appIds.danApproved, countyId: seed.county.turkana, reviewerId: seed.users.wardAdmin, stage: 'WARD_REVIEW' as never, decision: 'RECOMMENDED' as never, recommendedAmount: 38000, note: 'Strong need profile from ward committee.', reviewedAt: new Date('2026-02-21T12:00:00.000Z') },
    { id: 'f0eeb03c-aa9f-4f55-988f-70c3808c3003', applicationId: appIds.danApproved, countyId: seed.county.turkana, reviewerId: seed.users.financeOfficer, stage: 'COUNTY_REVIEW' as never, decision: 'APPROVED' as never, allocatedAmount: 35000, note: 'Approved within county allocation ceiling.', reviewedAt: new Date('2026-02-25T12:00:00.000Z') },
    { id: 'f0eeb03c-aa9f-4f55-988f-70c3808c3004', applicationId: appIds.eveDisbursed, countyId: seed.county.turkana, reviewerId: seed.users.wardAdmin, stage: 'WARD_REVIEW' as never, decision: 'RECOMMENDED' as never, recommendedAmount: 52000, note: 'Final year candidate prioritized.', reviewedAt: new Date('2026-02-15T12:00:00.000Z') },
    { id: 'f0eeb03c-aa9f-4f55-988f-70c3808c3005', applicationId: appIds.eveDisbursed, countyId: seed.county.turkana, reviewerId: seed.users.financeOfficer, stage: 'COUNTY_REVIEW' as never, decision: 'APPROVED' as never, allocatedAmount: 50000, note: 'Approved for full county disbursement.', reviewedAt: new Date('2026-02-18T12:00:00.000Z') },
    { id: 'f0eeb03c-aa9f-4f55-988f-70c3808c3006', applicationId: appIds.fatmaRejected, countyId: seed.county.turkana, reviewerId: seed.users.financeOfficer, stage: 'COUNTY_REVIEW' as never, decision: 'REJECTED' as never, note: 'Required verification documents were insufficient.', reviewedAt: new Date('2026-02-24T12:00:00.000Z') },
    { id: 'f0eeb03c-aa9f-4f55-988f-70c3808c3007', applicationId: appIds.gideonWaitlist, countyId: seed.county.turkana, reviewerId: seed.users.financeOfficer, stage: 'COUNTY_REVIEW' as never, decision: 'WAITLISTED' as never, note: 'Eligible but moved to waitlist due to allocation cap.', reviewedAt: new Date('2026-02-27T12:00:00.000Z') },
  ];
}

function buildTimeline(seed: SeedContext, appIds: ApplicationContext) {
  return [
    { id: 'fcc84fbe-3e20-4ef8-b5cd-edf129f94001', applicationId: appIds.aishaSubmitted, countyId: seed.county.turkana, actorId: seed.users.aisha, eventType: 'APPLICATION_SUBMITTED', fromStatus: 'DRAFT', toStatus: 'SUBMITTED', metadata: { note: 'Application submitted by student.' }, occurredAt: new Date('2026-03-05T09:00:00.000Z') },
    { id: 'fcc84fbe-3e20-4ef8-b5cd-edf129f94002', applicationId: appIds.brianWard, countyId: seed.county.turkana, actorId: null, eventType: 'AI_SCORED', fromStatus: 'SUBMITTED', toStatus: 'WARD_REVIEW', metadata: { note: 'AI score ingested for ward prioritization.' }, occurredAt: new Date('2026-03-02T08:00:00.000Z') },
    { id: 'fcc84fbe-3e20-4ef8-b5cd-edf129f94003', applicationId: appIds.carolCounty, countyId: seed.county.turkana, actorId: seed.users.wardAdmin, eventType: 'WARD_REVIEW_RECOMMENDED', fromStatus: 'WARD_REVIEW', toStatus: 'COUNTY_REVIEW', metadata: { note: 'Ward committee recommended this case.' }, occurredAt: new Date('2026-03-03T12:05:00.000Z') },
    { id: 'fcc84fbe-3e20-4ef8-b5cd-edf129f94004', applicationId: appIds.danApproved, countyId: seed.county.turkana, actorId: seed.users.financeOfficer, eventType: 'COUNTY_REVIEW_APPROVED', fromStatus: 'COUNTY_REVIEW', toStatus: 'APPROVED', metadata: { note: 'County allocation approved.' }, occurredAt: new Date('2026-02-25T12:05:00.000Z') },
    { id: 'fcc84fbe-3e20-4ef8-b5cd-edf129f94005', applicationId: appIds.eveDisbursed, countyId: seed.county.turkana, actorId: seed.users.financeOfficer, eventType: 'DISBURSEMENT_SUCCESS', fromStatus: 'APPROVED', toStatus: 'DISBURSED', metadata: { note: 'M-Pesa disbursement completed.' }, occurredAt: new Date('2026-02-20T12:30:00.000Z') },
  ];
}
