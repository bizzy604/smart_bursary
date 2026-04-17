/**
 * Purpose: Validate county-admin tenant settings and scoring-weight APIs end to end.
 * Why important: Confirms branding/customization persistence and county isolation guarantees.
 * Used by: B-03 completion validation and regression checks.
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';

describe('Tenant settings (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let countyId = '';
	let countyAdminToken = '';
	let otherCountyId = '';
	let otherCountyAdminToken = '';

	beforeAll(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = moduleFixture.createNestApplication();
		app.setGlobalPrefix('api/v1');
		await app.init();

		prisma = moduleFixture.get(PrismaService);
		const jwtService = new JwtService({
			secret: process.env.JWT_SECRET || 'test-jwt-secret-test-jwt-secret',
		});

		const suffix = Date.now();
		const county = await prisma.county.create({
			data: {
				slug: `b03-settings-${suffix}`,
				name: 'B03 Settings County',
				fundName: 'B03 Fund',
				legalReference: 'No. 1 of 2024',
				primaryColor: '#1E3A5F',
				planTier: 'ENTERPRISE',
				isActive: true,
			},
		});
		countyId = county.id;

		const otherCounty = await prisma.county.create({
			data: {
				slug: `b03-settings-other-${suffix}`,
				name: 'B03 Other County',
				fundName: 'Other Fund',
				primaryColor: '#14532D',
				planTier: 'ENTERPRISE',
				isActive: true,
			},
		});
		otherCountyId = otherCounty.id;

		const countyAdmin = await prisma.user.create({
			data: {
				countyId,
				email: `b03-admin-${suffix}@example.com`,
				passwordHash: 'hashed-password',
				role: UserRole.COUNTY_ADMIN,
				emailVerified: true,
				phoneVerified: true,
			},
		});

		const otherCountyAdmin = await prisma.user.create({
			data: {
				countyId: otherCountyId,
				email: `b03-admin-other-${suffix}@example.com`,
				passwordHash: 'hashed-password',
				role: UserRole.COUNTY_ADMIN,
				emailVerified: true,
				phoneVerified: true,
			},
		});

		countyAdminToken = jwtService.sign({
			sub: countyAdmin.id,
			email: countyAdmin.email,
			role: countyAdmin.role,
			countyId,
			wardId: null,
		});

		otherCountyAdminToken = jwtService.sign({
			sub: otherCountyAdmin.id,
			email: otherCountyAdmin.email,
			role: otherCountyAdmin.role,
			countyId: otherCountyId,
			wardId: null,
		});
	});

	afterAll(async () => {
		await app.close();
	});

	it('returns county settings with safe defaults', async () => {
		const response = await request(app.getHttpServer())
			.get('/api/v1/admin/settings')
			.set('Authorization', `Bearer ${countyAdminToken}`)
			.expect(200);

		expect(response.body.data.countyId).toBe(countyId);
		expect(response.body.data.branding.countyName).toBe('B03 Settings County');
		expect(response.body.data.formCustomization.sectionOrder).toHaveLength(6);
		expect(response.body.data.scoringWeights.family_status).toBe(0.25);
	});

	it('updates branding and form customization for the current county only', async () => {
		const response = await request(app.getHttpServer())
			.patch('/api/v1/admin/settings')
			.set('Authorization', `Bearer ${countyAdminToken}`)
			.send({
				branding: {
					countyName: 'B03 County Updated',
					fundName: 'B03 Future Education Fund',
					legalReference: 'No. 12 of 2026',
					primaryColor: '#0F4C81',
					logoText: 'B3',
					logoS3Key: 'county-assets/b03/logo.png',
				},
				formCustomization: {
					colorScheme: 'COUNTY_PRIMARY',
					logoPlacement: 'HEADER_LEFT',
					sectionOrder: ['section-a', 'section-c', 'section-b', 'section-d', 'section-e', 'section-f'],
				},
			})
			.expect(200);

		expect(response.body.data.branding.countyName).toBe('B03 County Updated');
		expect(response.body.data.branding.primaryColor).toBe('#0F4C81');
		expect(response.body.data.formCustomization.logoPlacement).toBe('HEADER_LEFT');
		expect(response.body.data.formCustomization.sectionOrder[1]).toBe('section-c');

		const updatedCounty = await prisma.county.findUniqueOrThrow({
			where: { id: countyId },
			select: { name: true, fundName: true, primaryColor: true, logoS3Key: true },
		});
		expect(updatedCounty.name).toBe('B03 County Updated');
		expect(updatedCounty.fundName).toBe('B03 Future Education Fund');
		expect(updatedCounty.primaryColor).toBe('#0F4C81');
		expect(updatedCounty.logoS3Key).toBe('county-assets/b03/logo.png');
	});

	it('keeps county isolation when another county admin updates settings', async () => {
		await request(app.getHttpServer())
			.patch('/api/v1/admin/settings')
			.set('Authorization', `Bearer ${otherCountyAdminToken}`)
			.send({
				branding: {
					fundName: 'Other County Updated Fund',
				},
			})
			.expect(200);

		const ownCounty = await prisma.county.findUniqueOrThrow({
			where: { id: countyId },
			select: { fundName: true },
		});
		const otherCounty = await prisma.county.findUniqueOrThrow({
			where: { id: otherCountyId },
			select: { fundName: true },
		});

		expect(ownCounty.fundName).toBe('B03 Future Education Fund');
		expect(otherCounty.fundName).toBe('Other County Updated Fund');
	});

	it('rejects invalid section order payloads', async () => {
		await request(app.getHttpServer())
			.patch('/api/v1/admin/settings')
			.set('Authorization', `Bearer ${countyAdminToken}`)
			.send({
				formCustomization: {
					sectionOrder: ['section-a', 'section-a', 'section-b', 'section-c', 'section-d', 'section-e'],
				},
			})
			.expect(400);
	});

	it('returns and updates scoring weights through admin endpoints', async () => {
		await request(app.getHttpServer())
			.patch('/api/v1/admin/scoring-weights')
			.set('Authorization', `Bearer ${countyAdminToken}`)
			.send({
				family_status: 0.3,
				family_income: 0.2,
				education_burden: 0.2,
				academic_standing: 0.1,
				document_quality: 0.1,
				integrity: 0.1,
			})
			.expect(200);

		const response = await request(app.getHttpServer())
			.get('/api/v1/admin/scoring-weights')
			.set('Authorization', `Bearer ${countyAdminToken}`)
			.expect(200);

		expect(response.body.data.weights.family_status).toBe(0.3);
		expect(response.body.data.weights.integrity).toBe(0.1);
		expect(response.body.data.scoringWeightsUpdatedAt).toBeTruthy();
	});
});
