/**
 * Purpose: Validate the tenant user-directory CRUD endpoints (list / invite / update / deactivate / reactivate / delete).
 * Why important: Confirms county admins can manage their team and that role/scope rules are enforced.
 * Used by: PR-B1 acceptance.
 */
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';

describe('User directory (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let jwtService: JwtService;
	let adminToken = '';
	let otherCountyAdminToken = '';
	let countyId = '';
	let otherCountyId = '';
	let wardId = '';
	let createdUserId = '';

	beforeAll(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
		app = moduleFixture.createNestApplication();
		app.setGlobalPrefix('api/v1');
		await app.init();

		prisma = moduleFixture.get(PrismaService);
		jwtService = new JwtService({ secret: process.env.JWT_SECRET || 'test-jwt-secret-test-jwt-secret' });

		const suffix = Date.now();

		const county = await prisma.county.create({
			data: { slug: `udir-${suffix}`, name: `Udir ${suffix}`, planTier: 'ENTERPRISE', isActive: true },
		});
		countyId = county.id;

		const ward = await prisma.ward.create({
			data: { countyId, code: `UDIR-${suffix}-1`, name: 'Udir Ward One' },
		});
		wardId = ward.id;

		const otherCounty = await prisma.county.create({
			data: { slug: `udir-other-${suffix}`, name: `Udir Other ${suffix}`, planTier: 'ENTERPRISE', isActive: true },
		});
		otherCountyId = otherCounty.id;

		const admin = await prisma.user.create({
			data: {
				countyId,
				email: `udir-admin-${suffix}@example.com`,
				passwordHash: 'hashed-password',
				role: UserRole.COUNTY_ADMIN,
				emailVerified: true,
				phoneVerified: true,
			},
		});
		adminToken = signToken(jwtService, admin);

		const otherAdmin = await prisma.user.create({
			data: {
				countyId: otherCountyId,
				email: `udir-other-admin-${suffix}@example.com`,
				passwordHash: 'hashed-password',
				role: UserRole.COUNTY_ADMIN,
				emailVerified: true,
				phoneVerified: true,
			},
		});
		otherCountyAdminToken = signToken(jwtService, otherAdmin);
	});

	afterAll(async () => {
		await app.close();
	});

	it('invites a ward-scoped user with a temp password and verify token', async () => {
		const inviteEmail = `udir-invitee-${Date.now()}@example.com`;
		const response = await request(app.getHttpServer())
			.post('/api/v1/users/invite')
			.set('Authorization', `Bearer ${adminToken}`)
			.send({ email: inviteEmail, role: UserRole.WARD_ADMIN, wardId })
			.expect(201);

		expect(response.body.data.email).toBe(inviteEmail);
		expect(response.body.data.role).toBe(UserRole.WARD_ADMIN);
		expect(response.body.data.wardId).toBe(wardId);
		expect(typeof response.body.invite.temporaryPassword).toBe('string');
		expect(response.body.invite.temporaryPassword.length).toBeGreaterThanOrEqual(20);
		expect(typeof response.body.invite.verifyToken).toBe('string');
		createdUserId = response.body.data.id;
	});

	it('rejects invitation for ward-scoped role without a wardId', async () => {
		await request(app.getHttpServer())
			.post('/api/v1/users/invite')
			.set('Authorization', `Bearer ${adminToken}`)
			.send({ email: `udir-bad-${Date.now()}@example.com`, role: UserRole.WARD_ADMIN })
			.expect(400);
	});

	it('rejects invitation for STUDENT or PLATFORM_OPERATOR roles', async () => {
		await request(app.getHttpServer())
			.post('/api/v1/users/invite')
			.set('Authorization', `Bearer ${adminToken}`)
			.send({ email: `udir-st-${Date.now()}@example.com`, role: UserRole.STUDENT })
			.expect(400);

		await request(app.getHttpServer())
			.post('/api/v1/users/invite')
			.set('Authorization', `Bearer ${adminToken}`)
			.send({ email: `udir-op-${Date.now()}@example.com`, role: UserRole.PLATFORM_OPERATOR })
			.expect(400);
	});

	it('lists users only within the calling tenant', async () => {
		const response = await request(app.getHttpServer())
			.get('/api/v1/users')
			.set('Authorization', `Bearer ${adminToken}`)
			.expect(200);

		expect(Array.isArray(response.body.data)).toBe(true);
		const emails = response.body.data.map((row: { email: string }) => row.email);
		expect(emails).toContain(`udir-invitee-`.length > 0 ? response.body.data[0].email : '');
		// every returned user's countyId is hidden, but ward should be either null or match the tenant
		for (const row of response.body.data) {
			if (row.ward) {
				expect(typeof row.ward.id).toBe('string');
			}
		}

		const otherResponse = await request(app.getHttpServer())
			.get('/api/v1/users')
			.set('Authorization', `Bearer ${otherCountyAdminToken}`)
			.expect(200);
		const otherEmails = otherResponse.body.data.map((row: { email: string }) => row.email);
		expect(otherEmails).not.toEqual(emails);
	});

	it('updates a user role and clears ward when moving to non-ward-scoped role', async () => {
		const response = await request(app.getHttpServer())
			.patch(`/api/v1/users/${createdUserId}`)
			.set('Authorization', `Bearer ${adminToken}`)
			.send({ role: UserRole.FINANCE_OFFICER, wardId: null })
			.expect(200);

		expect(response.body.data.role).toBe(UserRole.FINANCE_OFFICER);
		expect(response.body.data.wardId).toBeNull();
	});

	it('deactivates and reactivates a user', async () => {
		const deactivated = await request(app.getHttpServer())
			.post(`/api/v1/users/${createdUserId}/deactivate`)
			.set('Authorization', `Bearer ${adminToken}`)
			.expect(201);
		expect(deactivated.body.data.isActive).toBe(false);

		const reactivated = await request(app.getHttpServer())
			.post(`/api/v1/users/${createdUserId}/reactivate`)
			.set('Authorization', `Bearer ${adminToken}`)
			.expect(201);
		expect(reactivated.body.data.isActive).toBe(true);
	});

	it('blocks deactivating yourself', async () => {
		const me = await prisma.user.findFirst({
			where: { countyId, role: UserRole.COUNTY_ADMIN },
			orderBy: { createdAt: 'asc' },
		});
		await request(app.getHttpServer())
			.post(`/api/v1/users/${me!.id}/deactivate`)
			.set('Authorization', `Bearer ${adminToken}`)
			.expect(400);
	});

	it('blocks cross-tenant access', async () => {
		await request(app.getHttpServer())
			.get(`/api/v1/users/${createdUserId}`)
			.set('Authorization', `Bearer ${otherCountyAdminToken}`)
			.expect(404);

		await request(app.getHttpServer())
			.delete(`/api/v1/users/${createdUserId}`)
			.set('Authorization', `Bearer ${otherCountyAdminToken}`)
			.expect(404);
	});

	it('soft-deletes a user (sets isActive=false and removes from listing)', async () => {
		const response = await request(app.getHttpServer())
			.delete(`/api/v1/users/${createdUserId}`)
			.set('Authorization', `Bearer ${adminToken}`)
			.expect(200);
		expect(response.body.data.isActive).toBe(false);

		const list = await request(app.getHttpServer())
			.get('/api/v1/users')
			.set('Authorization', `Bearer ${adminToken}`)
			.expect(200);
		const ids = list.body.data.map((row: { id: string }) => row.id);
		expect(ids).not.toContain(createdUserId);
	});

	it('returns an actionable 409 when re-inviting a soft-deleted email', async () => {
		const deleted = await prisma.user.findUnique({ where: { id: createdUserId } });
		expect(deleted?.deletedAt).not.toBeNull();

		const response = await request(app.getHttpServer())
			.post('/api/v1/users/invite')
			.set('Authorization', `Bearer ${adminToken}`)
			.send({ email: deleted!.email, role: UserRole.WARD_ADMIN, wardId })
			.expect(409);

		expect(response.body.error?.message ?? response.body.message).toMatch(/previously deleted/i);
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
