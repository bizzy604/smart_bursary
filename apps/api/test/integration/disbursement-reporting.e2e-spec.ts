/**
 * Purpose: Validate disbursement initiation, status tracking, and reporting endpoints.
 * Why important: Proves P6 disbursement and reporting workflow behaves correctly.
 * Used by: P6 completion gate and release validation.
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';

import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';

describe('Disbursement and Reporting workflow (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let jwtService: JwtService;
	let applicationId = '';
	let programId = '';
	let countyId = '';
	let financeOfficerToken = '';

	beforeAll(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = moduleFixture.createNestApplication();
		app.setGlobalPrefix('api/v1');
		await app.init();

		prisma = moduleFixture.get(PrismaService);
		jwtService = new JwtService({ secret: process.env.JWT_SECRET || 'test-jwt-secret-test-jwt-secret' });

		// Setup: Create county, program, student, and approved application
		const county = await prisma.county.findUniqueOrThrow({ where: { slug: 'turkana' } });
		countyId = county.id;

		let ward = await prisma.ward.findFirst({ where: { countyId: county.id } });
		if (!ward) {
			ward = await prisma.ward.create({
				data: { countyId: county.id, name: 'Central Ward', code: 'CENT-001' },
			});
		}

		const financeOfficer = await prisma.user.create({
			data: {
				countyId,
				wardId: null,
				email: `finance-${Date.now()}@example.com`,
				passwordHash: 'hashed-password',
				role: 'FINANCE_OFFICER',
			},
		});

		financeOfficerToken = jwtService.sign({
			sub: financeOfficer.id,
			email: financeOfficer.email,
			role: financeOfficer.role,
			countyId: financeOfficer.countyId,
			wardId: financeOfficer.wardId,
		});

		const student = await prisma.user.create({
			data: {
				countyId,
				wardId: ward.id,
				email: `student-disbursement-${Date.now()}@example.com`,
				passwordHash: 'hashed-password',
				role: 'STUDENT',
			},
		});

		const program = await prisma.bursaryProgram.create({
			data: {
				countyId,
				wardId: ward.id,
				name: 'Disbursement Test Program',
				description: 'Program for disbursement tests',
				budgetCeiling: 200000,
				opensAt: new Date(),
				closesAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
				academicYear: '2026',
				status: 'ACTIVE',
				createdBy: financeOfficer.id,
			},
		});
		programId = program.id;

		const studentToken = jwtService.sign({
			sub: student.id,
			email: student.email,
			role: student.role,
			countyId: student.countyId,
			wardId: student.wardId,
		});

		// Create and approve application
		const draftResponse = await request(app.getHttpServer())
			.post('/api/v1/applications/draft')
			.set('Authorization', `Bearer ${studentToken}`)
			.send({ programId })
			.expect(201);

		applicationId = draftResponse.body.id;

		await request(app.getHttpServer())
			.post('/api/v1/applications/submit')
			.set('Authorization', `Bearer ${studentToken}`)
			.send({ applicationId })
			.expect(201);

		// Approve the application
		await prisma.application.update({
			where: { id: applicationId },
			data: { status: 'APPROVED', amountAllocated: 50000 },
		});

		// Add review with allocated amount
		await prisma.applicationReview.create({
			data: {
				applicationId,
				countyId,
				stage: 'COUNTY_REVIEW',
				decision: 'APPROVED',
				allocatedAmount: 50000,
				note: 'Approved for disbursement',
				reviewerId: financeOfficer.id,
			},
		});
	});

	afterAll(async () => {
		await app.close();
	});

	it('initiates disbursement for an approved application', async () => {
		const response = await request(app.getHttpServer())
			.post('/api/v1/disbursements')
			.set('Authorization', `Bearer ${financeOfficerToken}`)
			.send({
				applicationId,
				disbursementMethod: 'MPESA_B2C',
			})
			.expect(200);

		expect(response.body.data.amount).toBe(50000);
		expect(response.body.data.status).toBe('PENDING');
	});

	it('lists disbursements for county', async () => {
		const response = await request(app.getHttpServer())
			.get('/api/v1/disbursements')
			.set('Authorization', `Bearer ${financeOfficerToken}`)
			.expect(200);

		expect(Array.isArray(response.body.data)).toBe(true);
		expect(response.body.data.length).toBeGreaterThan(0);
	});

	it('gets disbursement detail', async () => {
		const listResponse = await request(app.getHttpServer())
			.get('/api/v1/disbursements')
			.set('Authorization', `Bearer ${financeOfficerToken}`)
			.expect(200);

		const disbursementId = listResponse.body.data[0].id;

		const detailResponse = await request(app.getHttpServer())
			.get(`/api/v1/disbursements/${disbursementId}`)
			.set('Authorization', `Bearer ${financeOfficerToken}`)
			.expect(200);

		expect(detailResponse.body.data.id).toBe(disbursementId);
	});

	it('gets dashboard summary with application counts', async () => {
		const response = await request(app.getHttpServer())
			.get('/api/v1/reports/dashboard')
			.set('Authorization', `Bearer ${financeOfficerToken}`)
			.expect(200);

		expect(response.body.data.totalApplications).toBeGreaterThan(0);
		expect(response.body.data.approvedApplications).toBeGreaterThan(0);
	});

	it('gets application counts by status', async () => {
		const response = await request(app.getHttpServer())
			.get('/api/v1/reports/applications/by-status')
			.set('Authorization', `Bearer ${financeOfficerToken}`)
			.expect(200);

		expect(Array.isArray(response.body.data)).toBe(true);
		expect(response.body.data[0].status).toBeDefined();
	});

	it('gets awards by program', async () => {
		const response = await request(app.getHttpServer())
			.get('/api/v1/reports/programs/awarded')
			.set('Authorization', `Bearer ${financeOfficerToken}`)
			.expect(200);

		expect(Array.isArray(response.body.data)).toBe(true);
		const testProgram = response.body.data.find((p: any) => p.programId === programId);
		expect(testProgram).toBeDefined();
		expect(testProgram.awardedCount).toBe(1);
		expect(testProgram.totalAwarded).toBe(50000);
	});
});
