/**
 * Purpose: Seed baseline county and ward records for local development.
 * Why important: Provides deterministic starter data for P1 validation and module development.
 * Used by: Prisma seed command and local setup workflows.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const county = await prisma.county.upsert({
    where: { slug: 'turkana' },
    update: {
      name: 'Turkana County',
      fundName: 'Turkana County Education Fund',
      planTier: 'BASIC',
      isActive: true,
    },
    create: {
      slug: 'turkana',
      name: 'Turkana County',
      fundName: 'Turkana County Education Fund',
      legalReference: 'No. 4 of 2023',
      planTier: 'BASIC',
      isActive: true,
    },
  });

  const wards = [
    { code: 'TRK-001', name: 'Lodwar Township' },
    { code: 'TRK-002', name: 'Kanamkemer' },
    { code: 'TRK-003', name: 'Kakuma' },
  ];

  for (const ward of wards) {
    await prisma.ward.upsert({
      where: {
        countyId_code: {
          countyId: county.id,
          code: ward.code,
        },
      },
      update: {
        name: ward.name,
        isActive: true,
      },
      create: {
        countyId: county.id,
        code: ward.code,
        name: ward.name,
        isActive: true,
      },
    });
  }

  // Keep seed output concise for CI and local setup logs.
  console.log('Seed completed: county turkana with 3 wards');
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
