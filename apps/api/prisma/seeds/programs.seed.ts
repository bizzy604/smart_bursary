/**
 * Purpose: Seed active and historical bursary programs with eligibility rules.
 * Why important: Frontend program discovery, analytics, and review queues depend on program metadata.
 * Used by: Prisma seed entrypoint after foundation seeding.
 */
import { PrismaClient, ProgramStatus } from '@prisma/client';

import { ProgramContext, SeedContext } from './seed-types';

const PROGRAM_IDS: ProgramContext = {
  main: '3d8aebac-9541-4cf1-825f-9d2e2d8a1001',
  ward: '3d8aebac-9541-4cf1-825f-9d2e2d8a1002',
  legacy: '3d8aebac-9541-4cf1-825f-9d2e2d8a1003',
};

export async function seedPrograms(prisma: PrismaClient, seed: SeedContext): Promise<ProgramContext> {
  const now = Date.now();
  const openAt = new Date(now - 45 * 24 * 60 * 60 * 1000);
  const closeAt = new Date(now + 90 * 24 * 60 * 60 * 1000);

  await prisma.bursaryProgram.upsert({
    where: { id: PROGRAM_IDS.main },
    update: {
      countyId: seed.county.turkana,
      wardId: null,
      name: 'Turkana County Merit and Need Bursary 2026',
      description: 'Supports secondary, TVET, and university students with demonstrated financial need.',
      budgetCeiling: 2_500_000,
      allocatedTotal: 85_000,
      disbursedTotal: 50_000,
      opensAt: openAt,
      closesAt: closeAt,
      academicYear: '2026',
      status: ProgramStatus.ACTIVE,
      createdBy: seed.users.countyAdmin,
    },
    create: {
      id: PROGRAM_IDS.main,
      countyId: seed.county.turkana,
      wardId: null,
      name: 'Turkana County Merit and Need Bursary 2026',
      description: 'Supports secondary, TVET, and university students with demonstrated financial need.',
      budgetCeiling: 2_500_000,
      allocatedTotal: 85_000,
      disbursedTotal: 50_000,
      opensAt: openAt,
      closesAt: closeAt,
      academicYear: '2026',
      status: ProgramStatus.ACTIVE,
      createdBy: seed.users.countyAdmin,
    },
  });

  await prisma.bursaryProgram.upsert({
    where: { id: PROGRAM_IDS.ward },
    update: {
      countyId: seed.county.turkana,
      wardId: seed.wards.lodwar,
      name: 'Lodwar Ward Talent Support 2026',
      description: 'Ward-targeted support for students from Lodwar Township.',
      budgetCeiling: 750_000,
      allocatedTotal: 0,
      disbursedTotal: 0,
      opensAt: openAt,
      closesAt: closeAt,
      academicYear: '2026',
      status: ProgramStatus.ACTIVE,
      createdBy: seed.users.countyAdmin,
    },
    create: {
      id: PROGRAM_IDS.ward,
      countyId: seed.county.turkana,
      wardId: seed.wards.lodwar,
      name: 'Lodwar Ward Talent Support 2026',
      description: 'Ward-targeted support for students from Lodwar Township.',
      budgetCeiling: 750_000,
      allocatedTotal: 0,
      disbursedTotal: 0,
      opensAt: openAt,
      closesAt: closeAt,
      academicYear: '2026',
      status: ProgramStatus.ACTIVE,
      createdBy: seed.users.countyAdmin,
    },
  });

  await prisma.bursaryProgram.upsert({
    where: { id: PROGRAM_IDS.legacy },
    update: {
      countyId: seed.county.turkana,
      wardId: null,
      name: 'Turkana County Bursary 2025',
      description: 'Historical cycle retained for trend analytics.',
      budgetCeiling: 1_900_000,
      allocatedTotal: 28_000,
      disbursedTotal: 28_000,
      opensAt: new Date('2025-01-10T00:00:00.000Z'),
      closesAt: new Date('2025-09-30T00:00:00.000Z'),
      academicYear: '2025',
      status: ProgramStatus.CLOSED,
      createdBy: seed.users.countyAdmin,
    },
    create: {
      id: PROGRAM_IDS.legacy,
      countyId: seed.county.turkana,
      wardId: null,
      name: 'Turkana County Bursary 2025',
      description: 'Historical cycle retained for trend analytics.',
      budgetCeiling: 1_900_000,
      allocatedTotal: 28_000,
      disbursedTotal: 28_000,
      opensAt: new Date('2025-01-10T00:00:00.000Z'),
      closesAt: new Date('2025-09-30T00:00:00.000Z'),
      academicYear: '2025',
      status: ProgramStatus.CLOSED,
      createdBy: seed.users.countyAdmin,
    },
  });

  await prisma.eligibilityRule.deleteMany({ where: { programId: { in: Object.values(PROGRAM_IDS) } } });
  await prisma.eligibilityRule.createMany({
    data: [
      {
        id: 'a64cbf6d-3fb8-48ff-9313-75da36fe2001',
        programId: PROGRAM_IDS.main,
        countyId: seed.county.turkana,
        ruleType: 'EDUCATION_LEVEL',
        parameters: { allowed: ['UNIVERSITY', 'TVET', 'SECONDARY'] },
      },
      {
        id: 'a64cbf6d-3fb8-48ff-9313-75da36fe2002',
        programId: PROGRAM_IDS.main,
        countyId: seed.county.turkana,
        ruleType: 'INCOME_BRACKET',
        parameters: { max_annual_income_kes: 600000 },
      },
      {
        id: 'a64cbf6d-3fb8-48ff-9313-75da36fe2003',
        programId: PROGRAM_IDS.ward,
        countyId: seed.county.turkana,
        ruleType: 'EDUCATION_LEVEL',
        parameters: { allowed: ['UNIVERSITY', 'TVET'] },
      },
      {
        id: 'a64cbf6d-3fb8-48ff-9313-75da36fe2004',
        programId: PROGRAM_IDS.ward,
        countyId: seed.county.turkana,
        ruleType: 'INCOME_BRACKET',
        parameters: { max_annual_income_kes: 500000 },
      },
    ],
  });

  return PROGRAM_IDS;
}
