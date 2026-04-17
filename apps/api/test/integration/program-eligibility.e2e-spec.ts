/**
 * Purpose: Validate eligibility-driven program discovery and submission semantics.
 * Why important: Confirms students receive eligibility flags and semantic 422 errors when blocked.
 * Used by: Phase 2 backend validation for BP-02 and BP-03.
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';
import { loginStudentToken, registerStudentUser } from './program-eligibility.helpers';

describe('Program Eligibility (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let eligibleToken = '';
	let ineligibleToken = '';
	let programId = '';
	let draftApplicationId = '';

	const countySlug = 'phase2-eligibility-county';
	const wardCode = `P2-${Date.now()}`;
	const eligibleEmail = `phase2.eligible.${Date.now()}@example.com`;
	const ineligibleEmail = `phase2.ineligible.${Date.now()}@example.com`;
	const password = 'StrongPass123!';

	beforeAll(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = moduleFixture.createNestApplication();
		app.setGlobalPrefix('api/v1');
		await app.init();

		prisma = moduleFixture.get(PrismaService);

		const county = await prisma.county.upsert({
			where: { slug: countySlug },
			update: {},
			create: {
				slug: countySlug,
				name: 'Phase 2 Eligibility County',
				fundName: 'Phase 2 Fund',
				planTier: 'ENTERPRISE',
				isActive: true,
			},
		});

		await prisma.ward.create({
			data: {
				countyId: county.id,
				name: 'Phase 2 Ward',
				code: wardCode,
			},
		});

		await registerStudentUser(app, eligibleEmail, password, countySlug, 'Eligible Student');
		await registerStudentUser(app, ineligibleEmail, password, countySlug, 'Ineligible Student');

		const eligibleUser = await prisma.user.findFirstOrThrow({
			where: { email: eligibleEmail, countyId: county.id },
			select: { id: true },
		});
		const ineligibleUser = await prisma.user.findFirstOrThrow({
			where: { email: ineligibleEmail, countyId: county.id },
			select: { id: true },
		});

		await prisma.academicInfo.upsert({
			where: { userId: eligibleUser.id },
			update: { institutionType: 'UNIVERSITY' },
			create: { userId: eligibleUser.id, countyId: county.id, institutionType: 'UNIVERSITY' },
		});
		await prisma.familyFinancialInfo.upsert({
			where: { userId: eligibleUser.id },
			update: { fatherIncomeKes: 200000, motherIncomeKes: 100000 },
			create: {
				userId: eligibleUser.id,
				countyId: county.id,
				fatherIncomeKes: 200000,
				motherIncomeKes: 100000,
			},
		});

		await prisma.academicInfo.upsert({
			where: { userId: ineligibleUser.id },
			update: { institutionType: 'SECONDARY' },
			create: { userId: ineligibleUser.id, countyId: county.id, institutionType: 'SECONDARY' },
		});
		await prisma.familyFinancialInfo.upsert({
			where: { userId: ineligibleUser.id },
			update: { fatherIncomeKes: 900000 },
			create: {
				userId: ineligibleUser.id,
				countyId: county.id,
				fatherIncomeKes: 900000,
			},
		});

		programId = (
			await prisma.bursaryProgram.create({
				data: {
					countyId: county.id,
					name: 'Phase 2 Eligibility Program',
					budgetCeiling: 2000000,
					opensAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
					closesAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
					academicYear: '2026',
					status: 'ACTIVE',
					createdBy: eligibleUser.id,
					eligibilityRules: {
						create: [
							{
								ruleType: 'EDUCATION_LEVEL',
								countyId: county.id,
								parameters: { allowed: ['UNIVERSITY'] },
							},
							{
								ruleType: 'INCOME_BRACKET',
								countyId: county.id,
								parameters: { max_annual_income_kes: 400000 },
							},
						],
					},
				},
				select: { id: true },
			})
		).id;

		eligibleToken = await loginStudentToken(app, eligibleEmail, password, countySlug);
		ineligibleToken = await loginStudentToken(app, ineligibleEmail, password, countySlug);
	});

	afterAll(async () => {
		await app.close();
	});

	it('returns eligibility flags in student program discovery', async () => {
		const eligibleResponse = await request(app.getHttpServer())
			.get('/api/v1/programs')
			.set('Authorization', `Bearer ${eligibleToken}`)
			.expect(200);
		const eligibleProgram = eligibleResponse.body.find((program: { id: string }) => program.id === programId);
		expect(eligibleProgram.eligible).toBe(true);
		expect(eligibleProgram.ineligibilityReason).toBeNull();

		const ineligibleResponse = await request(app.getHttpServer())
			.get('/api/v1/programs')
			.set('Authorization', `Bearer ${ineligibleToken}`)
			.expect(200);
		const ineligibleProgram = ineligibleResponse.body.find((program: { id: string }) => program.id === programId);
		expect(ineligibleProgram.eligible).toBe(false);
		expect(ineligibleProgram.ineligibilityReason).toBeTruthy();
	});

	it('rejects ineligible student draft creation with semantic 422', async () => {
		const response = await request(app.getHttpServer())
			.post('/api/v1/applications/draft')
			.set('Authorization', `Bearer ${ineligibleToken}`)
			.send({ programId })
			.expect(422);

		const code = response.body.error?.code ?? response.body.code ?? response.body.message?.code;
		expect(code).toBe('INELIGIBLE');
	});

	it('rejects submission after closesAt with semantic 422', async () => {
		const draftResponse = await request(app.getHttpServer())
			.post('/api/v1/applications/draft')
			.set('Authorization', `Bearer ${eligibleToken}`)
			.send({ programId })
			.expect(201);
		draftApplicationId = draftResponse.body.id;

		await prisma.bursaryProgram.update({
			where: { id: programId },
			data: { closesAt: new Date(Date.now() - 5 * 60 * 1000) },
		});

		const response = await request(app.getHttpServer())
			.post('/api/v1/applications/submit')
			.set('Authorization', `Bearer ${eligibleToken}`)
			.send({ applicationId: draftApplicationId })
			.expect(422);

		const code = response.body.error?.code ?? response.body.code ?? response.body.message?.code;
		expect(code).toBe('PROGRAM_CLOSED');
	});
});
