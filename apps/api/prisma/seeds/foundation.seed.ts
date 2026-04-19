/**
 * Purpose: Seed tenant, ward, user, and student profile foundation records.
 * Why important: Frontend flows require authenticated role accounts and profile-linked applicants.
 * Used by: Prisma seed entrypoint before program/workflow seeding.
 */
import { PrismaClient, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';

import { DEV_PASSWORD, SeedContext } from './seed-types';

type UserKey = keyof SeedContext['users'];
type CountyKey = keyof SeedContext['county'];
type WardKey = keyof SeedContext['wards'];

type UserSeed = {
  key: UserKey;
  county: CountyKey;
  email: string;
  role: UserRole;
  phone?: string;
  ward?: WardKey;
};

const TURKANA_WARDS = [
  { code: 'TRK-001', name: 'Lodwar Township', subCounty: 'Turkana Central' },
  { code: 'TRK-002', name: 'Kanamkemer', subCounty: 'Turkana North' },
  { code: 'TRK-003', name: 'Kakuma', subCounty: 'Turkana West' },
] as const;

const NAKURU_WARDS = [
  { code: 'NKR-001', name: 'Biashara', subCounty: 'Nakuru Town East' },
  { code: 'NKR-002', name: 'Kivumbini', subCounty: 'Nakuru Town East' },
] as const;

const USERS: UserSeed[] = [
  { key: 'platformOperator', county: 'turkana', email: 'platform.operator@smartbursary.dev', role: UserRole.PLATFORM_OPERATOR, phone: '+254700010000' },
  { key: 'countyAdmin', county: 'turkana', email: 'county.admin@turkana.go.ke', role: UserRole.COUNTY_ADMIN, phone: '+254700010001' },
  { key: 'financeOfficer', county: 'turkana', email: 'finance.officer@turkana.go.ke', role: UserRole.FINANCE_OFFICER, phone: '+254700010002' },
  { key: 'wardAdmin', county: 'turkana', email: 'ward.admin@turkana.go.ke', role: UserRole.WARD_ADMIN, phone: '+254700010003', ward: 'lodwar' },
  { key: 'aisha', county: 'turkana', email: 'aisha.student@turkana.go.ke', role: UserRole.STUDENT, phone: '+254700020001', ward: 'lodwar' },
  { key: 'brian', county: 'turkana', email: 'brian.student@turkana.go.ke', role: UserRole.STUDENT, phone: '+254700020002', ward: 'lodwar' },
  { key: 'carol', county: 'turkana', email: 'carol.student@turkana.go.ke', role: UserRole.STUDENT, phone: '+254700020003', ward: 'kanamkemer' },
  { key: 'dan', county: 'turkana', email: 'dan.student@turkana.go.ke', role: UserRole.STUDENT, phone: '+254700020004', ward: 'lodwar' },
  { key: 'eve', county: 'turkana', email: 'eve.student@turkana.go.ke', role: UserRole.STUDENT, phone: '+254700020005', ward: 'kakuma' },
  { key: 'fatma', county: 'turkana', email: 'fatma.student@turkana.go.ke', role: UserRole.STUDENT, phone: '+254700020006', ward: 'kanamkemer' },
  { key: 'gideon', county: 'turkana', email: 'gideon.student@turkana.go.ke', role: UserRole.STUDENT, phone: '+254700020007', ward: 'kakuma' },
  { key: 'hana', county: 'turkana', email: 'hana.student@turkana.go.ke', role: UserRole.STUDENT, phone: '+254700020008', ward: 'kakuma' },
  { key: 'nakuruAdmin', county: 'nakuru', email: 'county.admin@nakuru.go.ke', role: UserRole.COUNTY_ADMIN, phone: '+254700030001' },
];

const PROFILE_NAMES: Record<UserKey, string> = {
  platformOperator: 'Platform Operator',
  countyAdmin: 'County Administrator',
  financeOfficer: 'County Finance Officer',
  wardAdmin: 'Ward Committee Lead',
  aisha: 'Aisha Nareto',
  brian: 'Brian Ekal',
  carol: 'Carol Akiru',
  dan: 'Daniel Lokwang',
  eve: 'Evelyn Akeru',
  fatma: 'Fatma Ewoi',
  gideon: 'Gideon Erus',
  hana: 'Hannah Ekeya',
  nakuruAdmin: 'Nakuru Administrator',
};

const STUDENT_KEYS: UserKey[] = ['aisha', 'brian', 'carol', 'dan', 'eve', 'fatma', 'gideon', 'hana'];

export async function seedFoundation(prisma: PrismaClient): Promise<SeedContext> {
  const passwordHash = await hash(DEV_PASSWORD, 10);
  const turkana = await prisma.county.upsert({
    where: { slug: 'turkana' },
    update: {
      name: 'Turkana County',
      fundName: 'Turkana County Education Fund',
      legalReference: 'No. 4 of 2023',
      planTier: 'ENTERPRISE',
      isActive: true,
      primaryColor: '#1E3A5F',
      settings: {
        logoText: 'TC',
        scoringWeights: { family_status: 0.25, family_income: 0.25, education_burden: 0.2, academic_standing: 0.1, document_quality: 0.1, integrity: 0.1 },
      },
    },
    create: {
      slug: 'turkana', name: 'Turkana County', fundName: 'Turkana County Education Fund', legalReference: 'No. 4 of 2023',
      planTier: 'ENTERPRISE', isActive: true, primaryColor: '#1E3A5F', settings: { logoText: 'TC' },
    },
  });

  const nakuru = await prisma.county.upsert({
    where: { slug: 'nakuru' },
    update: { name: 'Nakuru County', fundName: 'Nakuru County Bursary Fund', planTier: 'BASIC', isActive: false, primaryColor: '#0F766E' },
    create: { slug: 'nakuru', name: 'Nakuru County', fundName: 'Nakuru County Bursary Fund', legalReference: 'No. 2 of 2024', planTier: 'BASIC', isActive: false, primaryColor: '#0F766E' },
  });

  const wards = {
    ...await seedWards(prisma, turkana.id, TURKANA_WARDS),
    ...(await seedWards(prisma, nakuru.id, NAKURU_WARDS)),
  };

  const countyIds = { turkana: turkana.id, nakuru: nakuru.id };
  const userIds = {} as SeedContext['users'];
  for (const user of USERS) {
    const saved = await prisma.user.upsert({
      where: { email_countyId: { email: user.email, countyId: countyIds[user.county] } },
      update: { role: user.role, wardId: user.ward ? wards[user.ward] : null, phone: user.phone ?? null, passwordHash, emailVerified: true, phoneVerified: Boolean(user.phone), isActive: true, deletedAt: null },
      create: { countyId: countyIds[user.county], wardId: user.ward ? wards[user.ward] : null, email: user.email, phone: user.phone ?? null, passwordHash, role: user.role, emailVerified: true, phoneVerified: Boolean(user.phone), isActive: true },
      select: { id: true },
    });
    userIds[user.key] = saved.id;
  }

  for (const key of Object.keys(PROFILE_NAMES) as UserKey[]) {
    const user = USERS.find((entry) => entry.key === key)!;
    await prisma.studentProfile.upsert({
      where: { userId: userIds[key] },
      update: { countyId: countyIds[user.county], fullName: PROFILE_NAMES[key], phone: user.phone ?? null, homeWard: user.ward ? TURKANA_WARDS.find((ward) => ward.code === (user.ward === 'lodwar' ? 'TRK-001' : user.ward === 'kanamkemer' ? 'TRK-002' : 'TRK-003'))?.name ?? null : null, profileComplete: STUDENT_KEYS.includes(key) },
      create: { userId: userIds[key], countyId: countyIds[user.county], fullName: PROFILE_NAMES[key], phone: user.phone ?? null, homeWard: user.ward ? (user.ward === 'lodwar' ? 'Lodwar Township' : user.ward === 'kanamkemer' ? 'Kanamkemer' : 'Kakuma') : null, profileComplete: STUDENT_KEYS.includes(key) },
    });
  }

  const academicRows = [
    ['aisha', 'UNIVERSITY', 'Turkana Technical University', 'Year 2', 'STU-2001', 'BSc Information Systems', 'Kenya Commercial Bank', '110023001'],
    ['brian', 'UNIVERSITY', 'Masinde Muliro University', 'Year 1', 'STU-2002', 'BSc Nursing', 'Equity Bank', '110023002'],
    ['carol', 'TVET', 'Lodwar Vocational College', 'Level 3', 'TVET-3001', 'Electrical Installation', 'KCB', '110023003'],
    ['dan', 'UNIVERSITY', 'Kisii University', 'Year 3', 'STU-2004', 'BCom Finance', 'Co-op Bank', '110023004'],
    ['eve', 'UNIVERSITY', 'University of Eldoret', 'Year 4', 'STU-2005', 'BEd Arts', 'KCB', '110023005'],
    ['fatma', 'SECONDARY', 'Lodwar Girls Secondary', 'Form 4', 'SEC-4006', 'KCSE', 'Family Bank', '110023006'],
    ['gideon', 'TVET', 'Kakuma Technical Centre', 'Level 2', 'TVET-3007', 'Automotive Engineering', 'Equity Bank', '110023007'],
    ['hana', 'UNIVERSITY', 'Moi University', 'Year 2', 'STU-2008', 'BSc Agriculture', 'KCB', '110023008'],
  ] as const;

  for (const [key, type, institution, yearClass, admission, course, bank, account] of academicRows) {
    await prisma.academicInfo.upsert({
      where: { userId: userIds[key] },
      update: { countyId: turkana.id, institutionType: type, institutionName: institution, yearFormClass: yearClass, admissionNumber: admission, courseName: course, bankName: bank, bankAccountName: PROFILE_NAMES[key], bankAccountNumber: Buffer.from(account, 'utf8') },
      create: { userId: userIds[key], countyId: turkana.id, institutionType: type, institutionName: institution, yearFormClass: yearClass, admissionNumber: admission, courseName: course, bankName: bank, bankAccountName: PROFILE_NAMES[key], bankAccountNumber: Buffer.from(account, 'utf8') },
    });
    await prisma.familyFinancialInfo.upsert({
      where: { userId: userIds[key] },
      update: { countyId: turkana.id, familyStatus: 'NEEDY', guardianName: `${PROFILE_NAMES[key]} Guardian`, guardianContact: USERS.find((user) => user.key === key)?.phone ?? null, numSiblingsInSchool: 2, fatherIncomeKes: 120000, motherIncomeKes: 80000, guardianIncomeKes: 40000 },
      create: { userId: userIds[key], countyId: turkana.id, familyStatus: 'NEEDY', guardianName: `${PROFILE_NAMES[key]} Guardian`, guardianContact: USERS.find((user) => user.key === key)?.phone ?? null, numSiblingsInSchool: 2, fatherIncomeKes: 120000, motherIncomeKes: 80000, guardianIncomeKes: 40000 },
    });
  }

  return {
    county: countyIds,
    wards: { lodwar: wards.lodwar, kanamkemer: wards.kanamkemer, kakuma: wards.kakuma },
    users: userIds,
  };
}

async function seedWards(
  prisma: PrismaClient,
  countyId: string,
  rows: ReadonlyArray<{ code: string; name: string; subCounty: string }>,
): Promise<Record<string, string>> {
  const wardIds: Record<string, string> = {};
  for (const ward of rows) {
    const saved = await prisma.ward.upsert({
      where: { countyId_code: { countyId, code: ward.code } },
      update: { name: ward.name, subCounty: ward.subCounty, isActive: true },
      create: { countyId, code: ward.code, name: ward.name, subCounty: ward.subCounty, isActive: true },
      select: { id: true },
    });
    if (ward.code === 'TRK-001') wardIds.lodwar = saved.id;
    if (ward.code === 'TRK-002') wardIds.kanamkemer = saved.id;
    if (ward.code === 'TRK-003') wardIds.kakuma = saved.id;
  }
  return wardIds;
}
