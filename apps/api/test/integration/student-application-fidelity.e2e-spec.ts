/**
 * Purpose: Validate section-level payload fidelity for student applications.
 * Why important: Ensures required family/disclosure fields persist and summary fields are surfaced for downstream workflows.
 * Used by: B-01 validation gate for application data fidelity.
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';
import {
	createActiveProgram,
	ensureCountyAndWard,
	registerStudentAndLogin,
} from './student-application.helpers';

describe('Student Application Section Fidelity (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let studentToken = '';
	let applicationId = '';

	beforeAll(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = moduleFixture.createNestApplication();
		app.setGlobalPrefix('api/v1');
		await app.init();

		prisma = moduleFixture.get(PrismaService);
		const countySlug = `fidelity-${Date.now()}`;
		const seeded = await ensureCountyAndWard(prisma, countySlug);

		const email = `fidelity.${Date.now()}@example.com`;
		studentToken = await registerStudentAndLogin(app, email, 'StrongPass123!', countySlug);
		const program = await createActiveProgram(prisma, seeded.countyId, seeded.wardId, 'Fidelity Program');

		const draftResponse = await request(app.getHttpServer())
			.post('/api/v1/applications/draft')
			.set('Authorization', `Bearer ${studentToken}`)
			.send({ programId: program.id })
			.expect(201);

		applicationId = draftResponse.body.id as string;
	});

	afterAll(async () => {
		await app.close();
	});

	it('persists full section payloads and syncs canonical amount/disclosure fields', async () => {
		await request(app.getHttpServer())
			.put(`/api/v1/applications/${applicationId}/section`)
			.set('Authorization', `Bearer ${studentToken}`)
			.send({
				sectionKey: 'section-b',
				data: JSON.stringify({
					requestedKes: 45000,
					feeBalanceKes: 60000,
					totalFeeKes: 120000,
					sponsorSupportKes: 18000,
					helbApplied: true,
					helbAmountKes: 30000,
					priorBursaryReceived: true,
					priorBursarySource: 'County Needy Students Fund',
					priorBursaryAmountKes: 15000,
					reasonForSupport: 'Household income has dropped and the current fee balance is overdue.',
				}),
			})
			.expect(200);

		await request(app.getHttpServer())
			.put(`/api/v1/applications/${applicationId}/section`)
			.set('Authorization', `Bearer ${studentToken}`)
			.send({
				sectionKey: 'section-c',
				data: JSON.stringify({
					familyStatus: 'SINGLE_PARENT',
					guardianName: 'Mary Akiru',
					guardianRelationship: 'Mother',
					guardianPhone: '+254700000010',
					householdSize: 6,
					dependantsInSchool: 3,
					siblings: [
						{
							name: 'Akinyi Akiru',
							institution: 'Lodwar Girls High School',
							level: 'Form 3',
							annualFeeKes: 45000,
							feePaidKes: 20000,
						},
					],
				}),
			})
			.expect(200);

		await request(app.getHttpServer())
			.put(`/api/v1/applications/${applicationId}/section`)
			.set('Authorization', `Bearer ${studentToken}`)
			.send({
				sectionKey: 'section-d',
				data: JSON.stringify({
					income: {
						fatherMonthlyIncomeKes: 0,
						motherMonthlyIncomeKes: 12000,
						guardianMonthlyIncomeKes: 0,
						additionalIncomeKes: 3000,
					},
					hardshipNarrative: 'The family is unable to clear arrears due to reduced casual income this year.',
				}),
			})
			.expect(200);

		await request(app.getHttpServer())
			.put(`/api/v1/applications/${applicationId}/section`)
			.set('Authorization', `Bearer ${studentToken}`)
			.send({
				sectionKey: 'section-e',
				data: JSON.stringify({
					hasOtherBursary: false,
					hasDisabilityNeeds: true,
					disabilityDetails: 'Needs periodic assistive-learning support.',
					declarationName: 'Jane Akiru',
					confirmTruth: true,
					authorizeVerification: true,
					acceptPrivacyPolicy: true,
				}),
			})
			.expect(200);

		const response = await request(app.getHttpServer())
			.get(`/api/v1/applications/${applicationId}`)
			.set('Authorization', `Bearer ${studentToken}`)
			.expect(200);

		expect(Number(response.body.amountRequested)).toBe(45000);
		expect(Number(response.body.outstandingBalance)).toBe(60000);
		expect(Number(response.body.totalFeeKes)).toBe(120000);

		const sections = response.body.sections as Array<{ sectionKey: string; data: Record<string, unknown> }>;
		const sectionMap = new Map(sections.map((section) => [section.sectionKey, section.data]));
		expect(sectionMap.get('section-b')?.helbApplied).toBe(true);
		expect(sectionMap.get('section-b')?.priorBursaryReceived).toBe(true);
		expect(sectionMap.get('section-b')?.priorBursarySource).toBe('County Needy Students Fund');
		expect(sectionMap.get('section-c')?.familyStatus).toBe('SINGLE_PARENT');
		expect(sectionMap.get('section-d')?.hardshipNarrative).toBeDefined();
		expect(sectionMap.get('section-e')?.hasDisabilityNeeds).toBe(true);
	});

	it('rejects invalid section payloads with validation error code', async () => {
		const response = await request(app.getHttpServer())
			.put(`/api/v1/applications/${applicationId}/section`)
			.set('Authorization', `Bearer ${studentToken}`)
			.send({
				sectionKey: 'section-b',
				data: JSON.stringify({
					requestedKes: 0,
					reasonForSupport: '',
				}),
			})
			.expect(400);

		expect(response.body.error?.code).toBe('VALIDATION_ERROR');
		expect(Array.isArray(response.body.error?.details)).toBe(true);
	});
});
