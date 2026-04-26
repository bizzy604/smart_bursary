/**
 * Purpose: Validate platform-operator tenant lifecycle endpoints (deactivate / reactivate / soft-delete).
 * Why important: Confirms tenant suspension and removal preserve isolation, role gating, and registry visibility rules.
 * Used by: Phase 2B-Tenants completion validation and regression coverage.
 */
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';

describe('Tenant lifecycle (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let jwtService: JwtService;
	let operatorToken = '';
	let nonOperatorToken = '';
	let targetCountyId = '';

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
				slug: `tlc-host-${suffix}`,
				name: 'TLC Host County',
				planTier: 'ENTERPRISE',
				isActive: true,
			},
		});

		const operator = await prisma.user.create({
			data: {
				countyId: hostCounty.id,
				email: `tlc-operator-${suffix}@example.com`,
				passwordHash: 'hashed-password',
				role: UserRole.PLATFORM_OPERATOR,
				emailVerified: true,
				phoneVerified: true,
			},
		});

		const countyAdmin = await prisma.user.create({
			data: {
				countyId: hostCounty.id,
				email: `tlc-admin-${suffix}@example.com`,
				passwordHash: 'hashed-password',
				role: UserRole.COUNTY_ADMIN,
				emailVerified: true,
				phoneVerified: true,
			},
		});

		operatorToken = signToken(jwtService, operator);
		nonOperatorToken = signToken(jwtService, countyAdmin);

		const target = await prisma.county.create({
			data: {
				slug: `tlc-target-${suffix}`,
				name: 'TLC Target County',
				planTier: 'STANDARD',
				isActive: true,
			},
		});
		targetCountyId = target.id;
	});

	afterAll(async () => {
		await app.close();
	});

	it('rejects lifecycle endpoints for non-platform operators', async () => {
		await request(app.getHttpServer())
			.post(`/api/v1/platform/tenants/${targetCountyId}/deactivate`)
			.set('Authorization', `Bearer ${nonOperatorToken}`)
			.expect(403);

		await request(app.getHttpServer())
			.post(`/api/v1/platform/tenants/${targetCountyId}/reactivate`)
			.set('Authorization', `Bearer ${nonOperatorToken}`)
			.expect(403);

		await request(app.getHttpServer())
			.delete(`/api/v1/platform/tenants/${targetCountyId}`)
			.set('Authorization', `Bearer ${nonOperatorToken}`)
			.expect(403);
	});

	it('deactivates a tenant and flips isActive=false', async () => {
		const response = await request(app.getHttpServer())
			.post(`/api/v1/platform/tenants/${targetCountyId}/deactivate`)
			.set('Authorization', `Bearer ${operatorToken}`)
			.expect(200);

		expect(response.body.data.id).toBe(targetCountyId);
		expect(response.body.data.isActive).toBe(false);
		expect(response.body.data.deletedAt).toBeNull();

		const stored = await prisma.county.findUniqueOrThrow({
			where: { id: targetCountyId },
			select: { isActive: true, deletedAt: true },
		});
		expect(stored.isActive).toBe(false);
		expect(stored.deletedAt).toBeNull();
	});

	it('keeps deactivated tenant in registry list (still visible to operator)', async () => {
		const response = await request(app.getHttpServer())
			.get('/api/v1/platform/tenants')
			.set('Authorization', `Bearer ${operatorToken}`)
			.expect(200);

		const row = (response.body.data as Array<{ id: string; isActive: boolean }>).find(
			(c) => c.id === targetCountyId,
		);
		expect(row).toBeDefined();
		expect(row?.isActive).toBe(false);
	});

	it('reactivates a deactivated tenant', async () => {
		const response = await request(app.getHttpServer())
			.post(`/api/v1/platform/tenants/${targetCountyId}/reactivate`)
			.set('Authorization', `Bearer ${operatorToken}`)
			.expect(200);

		expect(response.body.data.isActive).toBe(true);
		expect(response.body.data.deletedAt).toBeNull();

		const stored = await prisma.county.findUniqueOrThrow({
			where: { id: targetCountyId },
			select: { isActive: true },
		});
		expect(stored.isActive).toBe(true);
	});

	it('rejects plan-tier updates for soft-deleted tenant', async () => {
		const suffix = Date.now();
		const doomed = await prisma.county.create({
			data: {
				slug: `tlc-doomed-${suffix}`,
				name: 'TLC Doomed County',
				planTier: 'BASIC',
				isActive: true,
			},
		});

		await request(app.getHttpServer())
			.delete(`/api/v1/platform/tenants/${doomed.id}`)
			.set('Authorization', `Bearer ${operatorToken}`)
			.expect(200);

		await request(app.getHttpServer())
			.patch(`/api/v1/platform/tenants/${doomed.id}/plan-tier`)
			.set('Authorization', `Bearer ${operatorToken}`)
			.send({ planTier: 'STANDARD' })
			.expect(404);

		const stored = await prisma.county.findUniqueOrThrow({
			where: { id: doomed.id },
			select: { isActive: true, deletedAt: true },
		});
		expect(stored.isActive).toBe(false);
		expect(stored.deletedAt).not.toBeNull();
	});

	it('soft-deletes a tenant and removes it from list / get / lifecycle endpoints', async () => {
		await request(app.getHttpServer())
			.delete(`/api/v1/platform/tenants/${targetCountyId}`)
			.set('Authorization', `Bearer ${operatorToken}`)
			.expect(200);

		const stored = await prisma.county.findUniqueOrThrow({
			where: { id: targetCountyId },
			select: { isActive: true, deletedAt: true },
		});
		expect(stored.isActive).toBe(false);
		expect(stored.deletedAt).not.toBeNull();

		const listResponse = await request(app.getHttpServer())
			.get('/api/v1/platform/tenants')
			.set('Authorization', `Bearer ${operatorToken}`)
			.expect(200);
		expect(
			(listResponse.body.data as Array<{ id: string }>).find((c) => c.id === targetCountyId),
		).toBeUndefined();

		await request(app.getHttpServer())
			.get(`/api/v1/platform/tenants/${targetCountyId}`)
			.set('Authorization', `Bearer ${operatorToken}`)
			.expect(404);

		await request(app.getHttpServer())
			.post(`/api/v1/platform/tenants/${targetCountyId}/reactivate`)
			.set('Authorization', `Bearer ${operatorToken}`)
			.expect(404);
	});

	it('returns 404 for unknown tenant ids', async () => {
		const ghostId = '00000000-0000-0000-0000-000000000000';
		await request(app.getHttpServer())
			.post(`/api/v1/platform/tenants/${ghostId}/deactivate`)
			.set('Authorization', `Bearer ${operatorToken}`)
			.expect(404);
		await request(app.getHttpServer())
			.delete(`/api/v1/platform/tenants/${ghostId}`)
			.set('Authorization', `Bearer ${operatorToken}`)
			.expect(404);
	});
});

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
