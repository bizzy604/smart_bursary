/**
 * Purpose: Validate B-04 tenant provisioning and plan-tier API feature gating.
 * Why important: Confirms operators can bootstrap counties and plan restrictions are enforced.
 * Used by: B-04 completion validation and regression coverage.
 */
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';

describe('Tenant provisioning and plan gates (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let jwtService: JwtService;
	let operatorToken = '';
	let nonOperatorToken = '';
	let provisionedCountyId = '';
	let provisionedSlug = '';
	let basicAdminToken = '';
	let standardAdminToken = '';
	let enterpriseAdminToken = '';

	beforeAll(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
		app = moduleFixture.createNestApplication();
		app.setGlobalPrefix('api/v1');
		await app.init();

		prisma = moduleFixture.get(PrismaService);
		jwtService = new JwtService({ secret: process.env.JWT_SECRET || 'test-jwt-secret-test-jwt-secret' });
		const suffix = Date.now();

		const hostCounty = await prisma.county.create({
			data: {
				slug: `b04-host-${suffix}`,
				name: 'B04 Host County',
				planTier: 'ENTERPRISE',
				isActive: true,
			},
		});

		const operator = await prisma.user.create({
			data: {
				countyId: hostCounty.id,
				email: `b04-operator-${suffix}@example.com`,
				passwordHash: 'hashed-password',
				role: UserRole.PLATFORM_OPERATOR,
				emailVerified: true,
				phoneVerified: true,
			},
		});

		const countyAdmin = await prisma.user.create({
			data: {
				countyId: hostCounty.id,
				email: `b04-admin-${suffix}@example.com`,
				passwordHash: 'hashed-password',
				role: UserRole.COUNTY_ADMIN,
				emailVerified: true,
				phoneVerified: true,
			},
		});

		operatorToken = signToken(jwtService, operator);
		nonOperatorToken = signToken(jwtService, countyAdmin);
		basicAdminToken = await createCountyAdminToken(prisma, jwtService, suffix, 'BASIC');
		standardAdminToken = await createCountyAdminToken(prisma, jwtService, suffix, 'STANDARD');
		enterpriseAdminToken = await createCountyAdminToken(prisma, jwtService, suffix, 'ENTERPRISE');
		provisionedSlug = `b04-provisioned-${suffix}`;
	});

	afterAll(async () => {
		await app.close();
	});

	it('provisions a county with default ward seed and county admin account', async () => {
		const response = await request(app.getHttpServer())
			.post('/api/v1/platform/tenants')
			.set('Authorization', `Bearer ${operatorToken}`)
			.send({
				slug: provisionedSlug,
				name: 'B04 Provisioned County',
				fundName: 'B04 Education Fund',
				legalReference: 'No. 8 of 2026',
				planTier: 'STANDARD',
				superAdmin: {
					email: 'bootstrap-admin@example.com',
					password: 'StrongPass!2026',
				},
			})
			.expect(201);

		provisionedCountyId = response.body.data.countyId;
		expect(response.body.data.wardCount).toBe(1450);
		expect(response.body.data.planTier).toBe('STANDARD');

		const wardCount = await prisma.ward.count({ where: { countyId: provisionedCountyId } });
		const admin = await prisma.user.findFirstOrThrow({
			where: { countyId: provisionedCountyId, role: UserRole.COUNTY_ADMIN },
			select: { email: true },
		});
		expect(wardCount).toBe(1450);
		expect(admin.email).toBe('bootstrap-admin@example.com');
	});

	it('blocks non-platform operators from provisioning routes', async () => {
		await request(app.getHttpServer())
			.post('/api/v1/platform/tenants')
			.set('Authorization', `Bearer ${nonOperatorToken}`)
			.send({
				slug: 'b04-forbidden',
				name: 'Forbidden County',
				superAdmin: { email: 'forbidden@example.com', password: 'StrongPass!2026' },
			})
			.expect(403);
	});

	it('rejects duplicate county slug provisioning attempts', async () => {
		await request(app.getHttpServer())
			.post('/api/v1/platform/tenants')
			.set('Authorization', `Bearer ${operatorToken}`)
			.send({
				slug: provisionedSlug,
				name: 'Duplicate Slug County',
				superAdmin: { email: 'duplicate@example.com', password: 'StrongPass!2026' },
			})
			.expect(409);
	});

	it('updates county plan tier through operator API', async () => {
		const response = await request(app.getHttpServer())
			.patch(`/api/v1/platform/tenants/${provisionedCountyId}/plan-tier`)
			.set('Authorization', `Bearer ${operatorToken}`)
			.send({ planTier: 'ENTERPRISE' })
			.expect(200);

		expect(response.body.data.planTier).toBe('ENTERPRISE');
	});

	it('enforces restricted and enterprise-only feature gates by plan tier', async () => {
		await request(app.getHttpServer())
			.get('/api/v1/admin/settings')
			.set('Authorization', `Bearer ${basicAdminToken}`)
			.expect(403);

		await request(app.getHttpServer())
			.get('/api/v1/admin/settings')
			.set('Authorization', `Bearer ${standardAdminToken}`)
			.expect(200);

		await request(app.getHttpServer())
			.patch('/api/v1/admin/scoring-weights')
			.set('Authorization', `Bearer ${standardAdminToken}`)
			.send({
				family_status: 0.25,
				family_income: 0.2,
				education_burden: 0.2,
				academic_standing: 0.15,
				document_quality: 0.1,
				integrity: 0.1,
			})
			.expect(403);

		await request(app.getHttpServer())
			.patch('/api/v1/admin/scoring-weights')
			.set('Authorization', `Bearer ${enterpriseAdminToken}`)
			.send({
				family_status: 0.3,
				family_income: 0.2,
				education_burden: 0.2,
				academic_standing: 0.1,
				document_quality: 0.1,
				integrity: 0.1,
			})
			.expect(200);
	});
});

async function createCountyAdminToken(
	prisma: PrismaService,
	jwtService: JwtService,
	suffix: number,
	planTier: 'BASIC' | 'STANDARD' | 'ENTERPRISE',
): Promise<string> {
	const county = await prisma.county.create({
		data: {
			slug: `b04-${planTier.toLowerCase()}-${suffix}`,
			name: `B04 ${planTier} County`,
			planTier,
			isActive: true,
		},
	});

	const admin = await prisma.user.create({
		data: {
			countyId: county.id,
			email: `b04-${planTier.toLowerCase()}-admin-${suffix}@example.com`,
			passwordHash: 'hashed-password',
			role: UserRole.COUNTY_ADMIN,
			emailVerified: true,
			phoneVerified: true,
		},
	});

	return signToken(jwtService, admin);
}

function signToken(
	jwtService: JwtService,
	user: { id: string; email: string; role: UserRole; countyId: string; wardId: string | null },
): string {
	return jwtService.sign({
		sub: user.id,
		email: user.email,
		role: user.role,
		countyId: user.countyId,
		wardId: user.wardId,
	});
}
