/**
 * Purpose: Validate B-06 reporting analytics datasets and export endpoints.
 * Why important: Ensures OCOB, ward summary, and historical trend APIs are operational and filterable.
 * Used by: B-06 completion validation for RP-01 through RP-04.
 */
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';
import { seedReportingDataset, signReportingToken } from './reporting-analytics.helpers';

describe('Reporting analytics and exports (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let jwtService: JwtService;
	let financeOfficerToken = '';
	let wardAdminToken = '';
	let countyId = '';
	let wardId = '';
	let programAId = '';
	let programBId = '';

	beforeAll(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
		app = moduleFixture.createNestApplication();
		app.setGlobalPrefix('api/v1');
		await app.init();

		prisma = moduleFixture.get(PrismaService);
		jwtService = new JwtService({ secret: process.env.JWT_SECRET || 'test-jwt-secret-test-jwt-secret' });
		const county = await prisma.county.findUniqueOrThrow({ where: { slug: 'turkana' } });
		countyId = county.id;

		const ward =
			(await prisma.ward.findFirst({ where: { countyId } })) ??
			(await prisma.ward.create({ data: { countyId, name: 'Reporting Ward', code: `RPT-${Date.now()}` } }));
		wardId = ward.id;

		const financeOfficer = await prisma.user.create({
			data: {
				countyId,
				email: `b06-finance-${Date.now()}@example.com`,
				passwordHash: 'hashed-password',
				role: UserRole.FINANCE_OFFICER,
				emailVerified: true,
				phoneVerified: true,
			},
		});
		const wardAdmin = await prisma.user.create({
			data: {
				countyId,
				wardId,
				email: `b06-ward-${Date.now()}@example.com`,
				passwordHash: 'hashed-password',
				role: UserRole.WARD_ADMIN,
				emailVerified: true,
				phoneVerified: true,
			},
		});
		financeOfficerToken = signReportingToken(jwtService, financeOfficer);
		wardAdminToken = signReportingToken(jwtService, wardAdmin);

		const seed = await seedReportingDataset({
			prisma,
			countyId,
			wardId,
			wardAdminId: wardAdmin.id,
			financeOfficerId: financeOfficer.id,
		});
		programAId = seed.programAId;
		programBId = seed.programBId;
	});

	afterAll(async () => {
		await app.close();
	});

	it('returns real-time dashboard payload with program and ward breakdown', async () => {
		const response = await request(app.getHttpServer())
			.get('/api/v1/reports/dashboard')
			.set('Authorization', `Bearer ${financeOfficerToken}`)
			.expect(200);

		expect(response.body.data.as_of).toBeDefined();
		expect(Array.isArray(response.body.data.programs)).toBe(true);
		expect(Array.isArray(response.body.data.ward_breakdown)).toBe(true);
		expect(response.body.data.totalApplications).toBeGreaterThan(0);
	});

	it('returns OCOB datasets and downloadable CSV/PDF exports', async () => {
		const report = await request(app.getHttpServer())
			.get('/api/v1/reports/ocob')
			.query({ programId: programAId })
			.set('Authorization', `Bearer ${financeOfficerToken}`)
			.expect(200);
		expect(report.body.data.rows[0].programId).toBe(programAId);
		expect(report.body.data.rows[0].allocatedKes).toBeGreaterThan(0);

		const csv = await request(app.getHttpServer())
			.get('/api/v1/reports/ocob/export')
			.query({ programId: programAId, format: 'csv' })
			.set('Authorization', `Bearer ${financeOfficerToken}`)
			.expect(200);
		expect(csv.headers['content-type']).toContain('text/csv');
		expect(csv.text).toContain('Program,Academic Year,Applications');

		const pdf = await request(app.getHttpServer())
			.get('/api/v1/reports/ocob/export')
			.query({ programId: programAId, format: 'pdf' })
			.set('Authorization', `Bearer ${financeOfficerToken}`)
			.expect(200);
		expect(pdf.headers['content-type']).toContain('application/pdf');
	});

	it('returns ward-level summary with AI/reviewer metadata and scoped exports', async () => {
		const financeReport = await request(app.getHttpServer())
			.get('/api/v1/reports/ward-summary')
			.query({ programId: programAId })
			.set('Authorization', `Bearer ${financeOfficerToken}`)
			.expect(200);
		expect(financeReport.body.data.rows[0].aiScore).toBeGreaterThan(0);
		expect(financeReport.body.data.rows[0].reviewerName).toBeDefined();
		expect(financeReport.body.data.rows[0].wardRecommendationKes).toBeGreaterThan(0);

		const wardScoped = await request(app.getHttpServer())
			.get('/api/v1/reports/ward-summary')
			.set('Authorization', `Bearer ${wardAdminToken}`)
			.expect(200);
		expect(wardScoped.body.data.rows.every((row: { wardName: string }) => row.wardName.length > 0)).toBe(true);

		const csv = await request(app.getHttpServer())
			.get('/api/v1/reports/ward-summary/export')
			.query({ programId: programAId, format: 'csv' })
			.set('Authorization', `Bearer ${financeOfficerToken}`)
			.expect(200);
		expect(csv.headers['content-type']).toContain('text/csv');
		expect(csv.text).toContain('AI Score,Recommendation (KES),Allocation (KES),Reviewer');
	});

	it('supports historical trend filters by year, program, ward, and education level', async () => {
		const response = await request(app.getHttpServer())
			.get('/api/v1/reports/trends')
			.query({
				programId: programAId,
				wardId,
				educationLevel: 'UNIVERSITY',
				fromYear: 2025,
				toYear: 2026,
			})
			.set('Authorization', `Bearer ${financeOfficerToken}`)
			.expect(200);

		expect(Array.isArray(response.body.data.trends)).toBe(true);
		expect(response.body.data.trends.length).toBeGreaterThan(0);
		expect(response.body.data.trends[0].academicYear).toBeDefined();
		expect(programBId).toBeDefined();
	});
});
