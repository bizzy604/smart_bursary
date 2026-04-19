/**
 * Purpose: Seed comprehensive tenant, workflow, and reporting fixtures for local development.
 * Why important: Provides end-to-end data required by frontend dashboards and review/disbursement flows.
 * Used by: Prisma seed command and local full-stack setup workflows.
 */
import { PrismaClient } from '@prisma/client';

import { seedArtifacts } from './seeds/artifacts.seed';
import { seedFoundation } from './seeds/foundation.seed';
import { seedPrograms } from './seeds/programs.seed';
import { DEV_PASSWORD } from './seeds/seed-types';
import { seedWorkflow } from './seeds/workflow.seed';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const seed = await seedFoundation(prisma);
  const programs = await seedPrograms(prisma, seed);
  const applications = await seedWorkflow(prisma, seed, programs);
  await seedArtifacts(prisma, seed, programs, applications);

  console.log('Seed completed with tenant, users, programs, workflow, and reporting artifacts.');
  console.log('Login password for seeded users:', DEV_PASSWORD);
  console.log('Seeded role accounts:');
  console.log(' - platform.operator@smartbursary.dev (PLATFORM_OPERATOR, county turkana)');
  console.log(' - county.admin@turkana.go.ke (COUNTY_ADMIN)');
  console.log(' - finance.officer@turkana.go.ke (FINANCE_OFFICER)');
  console.log(' - ward.admin@turkana.go.ke (WARD_ADMIN)');
  console.log(' - aisha.student@turkana.go.ke (STUDENT)');
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
