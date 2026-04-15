/**
 * Purpose: Validate student application workflow end-to-end.
 * Why important: Confirms P3 application lifecycle (draft, section updates, submit) with tenant scoping.
 * Used by: Phase P3 validation checklist.
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';

describe('Student Application Workflow (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let studentToken: string;
	let programId: string;
	let applicationId: string;
	const countySlug = 'turkana';

	beforeAll(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = moduleFixture.createNestApplication();
		app.setGlobalPrefix('api/v1');
		await app.init();

		prisma = moduleFixture.get(PrismaService);

		// Ensure county exists
		const county = await prisma.county.findUnique({ where: { slug: countySlug } });
		if (!county) {
			await prisma.county.create({
				data: {
					slug: countySlug,
					name: 'Turkana County',
					fundName: 'Turkana County Education Fund',
					planTier: 'BASIC',
					isActive: true,
				},
			});
		}

		// Create a ward
		const ward = await prisma.ward.findFirst({
			where: { county: { slug: countySlug } },
		});

		if (!ward) {
			await prisma.ward.create({
				data: {
					countyId: county?.id || (await prisma.county.findUniqueOrThrow({ where: { slug: countySlug } })).id,
					name: 'Central Ward',
					code: 'CENT-001',
				},
			});
		}

		// Create and login a student
		const suffix = Date.now().toString();
		const email = `student.${suffix}@example.com`;
		const password = 'StrongPass123!';

		await request(app.getHttpServer())
			.post('/api/v1/auth/register')
			.send({
				email,
				password,
				countySlug,
				fullName: 'Test Student',
				phone: '+254700000001',
			})
			.expect(201);

		const loginRes = await request(app.getHttpServer())
			.post('/api/v1/auth/login')
			.send({
				email,
				password,
				countySlug,
			})
			.expect(201);

		studentToken = loginRes.body.accessToken;

		// Create an active bursary program
		const countyData = await prisma.county.findUniqueOrThrow({ where: { slug: countySlug } });
		const wardData = await prisma.ward.findFirstOrThrow({
			where: { countyId: countyData.id },
		});

		const startUser = await prisma.user.findFirstOrThrow({
			where: { countyId: countyData.id },
		});

		const now = new Date();
		const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

		const program = await prisma.bursaryProgram.create({
			data: {
				countyId: countyData.id,
				wardId: wardData.id,
				name: 'Test Bursary 2026',
				description: 'Test bursary program',
				budgetCeiling: 1000000,
				opensAt: now,
				closesAt: futureDate,
				academicYear: '2026',
				status: 'ACTIVE',
				createdBy: startUser.id,
			},
		});

		programId = program.id;
	});

	afterAll(async () => {
		await app.close();
	});

	it('student lists active programs for their county', async () => {
		const response = await request(app.getHttpServer())
			.get('/api/v1/programs/active')
			.set('Authorization', `Bearer ${studentToken}`)
			.expect(200);

		expect(Array.isArray(response.body)).toBe(true);
		expect(response.body.length).toBeGreaterThan(0);
		expect(response.body[0].id).toBeDefined();
		expect(response.body[0].name).toBeDefined();
	});

	it('student views program details', async () => {
		const response = await request(app.getHttpServer())
			.get(`/api/v1/programs/${programId}`)
			.set('Authorization', `Bearer ${studentToken}`)
			.expect(200);

		expect(response.body.id).toBe(programId);
		expect(response.body.name).toBeDefined();
		expect(Array.isArray(response.body.eligibilityRules)).toBe(true);
	});

	it('student creates draft application for program', async () => {
		const response = await request(app.getHttpServer())
			.post('/api/v1/applications/draft')
			.set('Authorization', `Bearer ${studentToken}`)
			.send({
				programId,
			})
			.expect(201);

		expect(response.body.status).toBe('DRAFT');
		expect(response.body.id).toBeDefined();

		applicationId = response.body.id;
	});

	it('student updates application section with form data', async () => {
		const response = await request(app.getHttpServer())
			.put(`/api/v1/applications/${applicationId}/section`)
			.set('Authorization', `Bearer ${studentToken}`)
			.send({
				sectionKey: 'ACADEMIC_INFO',
				data: JSON.stringify({
					institutionName: 'Test School',
					yearFormClass: '4',
				}),
			})
			.expect(200);

		expect(response.body.sectionKey).toBe('ACADEMIC_INFO');
		expect(response.body.isComplete).toBe(false);
		expect(typeof response.body.data).toBe('object');
	});

	it('student views application with saved sections', async () => {
		const response = await request(app.getHttpServer())
			.get(`/api/v1/applications/${applicationId}`)
			.set('Authorization', `Bearer ${studentToken}`)
			.expect(200);

		expect(response.body.id).toBe(applicationId);
		expect(response.body.status).toBe('DRAFT');
		expect(Array.isArray(response.body.sections)).toBe(true);
		expect(response.body.sections.length).toBeGreaterThan(0);
	});

	it('student submits completed application', async () => {
		const response = await request(app.getHttpServer())
			.post('/api/v1/applications/submit')
			.set('Authorization', `Bearer ${studentToken}`)
			.send({
				applicationId,
			})
			.expect(201);

		expect(response.body.status).toBe('SUBMITTED');
		expect(response.body.submittedAt).toBeDefined();
		expect(response.body.submissionReference).toBeDefined();
	});

	it('student cannot create duplicate application for same program', async () => {
		const response = await request(app.getHttpServer())
			.post('/api/v1/applications/draft')
			.set('Authorization', `Bearer ${studentToken}`)
			.send({
				programId,
			})
			.expect(201);

		expect(response.body.id).toBe(applicationId);
	});

	it('student cannot submit a program after deadline', async () => {
		const countyData = await prisma.county.findUniqueOrThrow({ where: { slug: countySlug } });
		const wardData = await prisma.ward.findFirstOrThrow({
			where: { countyId: countyData.id },
		});
		const startUser = await prisma.user.findFirstOrThrow({
			where: { countyId: countyData.id },
		});

		const pastDate = new Date(Date.now() - 1000);
		const closedProgram = await prisma.bursaryProgram.create({
			data: {
				countyId: countyData.id,
				wardId: wardData.id,
				name: 'Closed Bursary 2025',
				budgetCeiling: 500000,
				opensAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
				closesAt: pastDate,
				academicYear: '2025',
				status: 'ACTIVE',
				createdBy: startUser.id,
			},
		});

		const draftRes = await request(app.getHttpServer())
			.post('/api/v1/applications/draft')
			.set('Authorization', `Bearer ${studentToken}`)
			.send({
				programId: closedProgram.id,
			})
			.expect(400);

		expect(draftRes.body.message || draftRes.body.error).toBeTruthy();
	});

	it('student lists only their own applications', async () => {
		const response = await request(app.getHttpServer())
			.get('/api/v1/applications/my-applications')
			.set('Authorization', `Bearer ${studentToken}`)
			.expect(200);

		expect(Array.isArray(response.body)).toBe(true);
		expect(response.body.length).toBeGreaterThan(0);
		expect(response.body[0].programId).toBeDefined();
		expect(response.body[0].status).toBeDefined();
	});
});
