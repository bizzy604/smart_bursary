/**
 * Purpose: Integration coverage for the cross-county identity registry (§5.3 L2).
 * Why important: This is the deterministic "Type-C ghost student" defense layer. We assert:
 *                - claim() succeeds for a fresh identity and stores only an HMAC hash;
 *                - re-claim() by the same application is idempotent (ALREADY_OWNED);
 *                - claim() from a different county in the same cycle is rejected (CONFLICT);
 *                - release() frees the slot for legitimate re-application;
 *                - normalisation makes "12 345 678" and "12345678" collide as expected.
 * Used by: Commit 6 of the data-integrity rollout.
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationStatus, UserRole } from '@prisma/client';

import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';
import { IdentityKind } from '../../modules/identity/dto/identity-claim.types';
import { IdentityRegistryService } from '../../modules/identity/services/identity-registry.service';

describe('IdentityRegistryService — cross-county active-cycle lock (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let identityRegistry: IdentityRegistryService;
	let turkanaCountyId = '';
	let nakuruCountyId = '';

	beforeAll(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();
		app = moduleFixture.createNestApplication();
		await app.init();

		prisma = moduleFixture.get(PrismaService);
		identityRegistry = moduleFixture.get(IdentityRegistryService);

		const turkana = await prisma.county.findUniqueOrThrow({ where: { slug: 'turkana' } });
		const nakuru = await prisma.county.findUniqueOrThrow({ where: { slug: 'nakuru' } });
		turkanaCountyId = turkana.id;
		nakuruCountyId = nakuru.id;
	});

	afterAll(async () => {
		await app.close();
	});

	/**
	 * Build a self-contained pair of (county, applicant, application) so the registry
	 * test does not depend on any seeded application IDs or share state with the
	 * allocation e2e suite.
	 */
	async function createApplicationFixture(countyId: string) {
		const unique = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
		// Ward.code is VARCHAR(20); use a short base36 suffix.
		const shortSuffix = Math.random().toString(36).slice(2, 12);
		const ward = await prisma.ward.create({
			data: { countyId, name: `Identity Ward ${unique}`, code: `IW-${shortSuffix}` },
		});
		const student = await prisma.user.create({
			data: {
				countyId,
				wardId: ward.id,
				email: `identity-student-${unique}@test.local`,
				passwordHash: 'h',
				role: UserRole.STUDENT,
				emailVerified: true,
				phoneVerified: true,
			},
		});
		const countyAdmin = await prisma.user.create({
			data: {
				countyId,
				email: `identity-county-${unique}@test.local`,
				passwordHash: 'h',
				role: UserRole.COUNTY_ADMIN,
				emailVerified: true,
				phoneVerified: true,
			},
		});
		const program = await prisma.bursaryProgram.create({
			data: {
				countyId,
				wardId: ward.id,
				name: `Identity Program ${unique}`,
				description: 'Identity registry integration test',
				budgetCeiling: 1_000_000,
				opensAt: new Date(),
				closesAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
				academicYear: '2026',
				status: 'ACTIVE',
				createdBy: countyAdmin.id,
			},
		});
		const application = await prisma.application.create({
			data: {
				countyId,
				applicantId: student.id,
				programId: program.id,
				wardId: ward.id,
				status: ApplicationStatus.SUBMITTED,
				submissionReference: `IRT-${unique}`,
			},
		});
		return { applicationId: application.id, countyId };
	}

	it('hashes deterministically and survives normalisation', () => {
		const a = identityRegistry.computeIdentityHash('12345678', IdentityKind.NATIONAL_ID);
		const b = identityRegistry.computeIdentityHash('12 345 678', IdentityKind.NATIONAL_ID);
		const c = identityRegistry.computeIdentityHash('  12345678  ', IdentityKind.NATIONAL_ID);
		// Prisma 6 returns Uint8Array (no .equals); compare via Buffer.compare.
		expect(Buffer.compare(Buffer.from(a), Buffer.from(b))).toBe(0);
		expect(Buffer.compare(Buffer.from(a), Buffer.from(c))).toBe(0);
		expect(a.length).toBe(32); // SHA-256
	});

	it('does not collide across IdentityKinds for the same numeric value', () => {
		const nationalId = identityRegistry.computeIdentityHash('98765432', IdentityKind.NATIONAL_ID);
		const upi = identityRegistry.computeIdentityHash('98765432', IdentityKind.NEMIS_UPI);
		expect(Buffer.compare(Buffer.from(nationalId), Buffer.from(upi))).not.toBe(0);
	});

	it('claims a fresh slot and stores ONLY the HMAC hash (no plaintext)', async () => {
		const fixture = await createApplicationFixture(turkanaCountyId);
		const rawId = `NID-A-${Date.now()}`;

		const outcome = await identityRegistry.claim({
			rawIdentity: rawId,
			kind: IdentityKind.NATIONAL_ID,
			cycle: '2026',
			applicationId: fixture.applicationId,
			countyId: fixture.countyId,
		});
		expect(outcome.kind).toBe('CLAIMED');

		// Verify the row stores only a hash, not the raw value.
		const row = await prisma.identityRegistry.findFirstOrThrow({
			where: { activeApplicationId: fixture.applicationId },
		});
		// Prisma 6 returns Bytes columns as Uint8Array; wrap in Buffer for assertions.
		const hashBuffer = Buffer.from(row.identityHash);
		expect(hashBuffer.length).toBe(32); // SHA-256 = 32 bytes
		expect(hashBuffer.toString('utf8').includes(rawId)).toBe(false);
		expect(row.activeCountyId).toBe(turkanaCountyId);
		expect(row.firstRegisteredCountyId).toBe(turkanaCountyId);
		expect(row.activeStatus).toBe(ApplicationStatus.SUBMITTED);
	});

	it('returns ALREADY_OWNED on an idempotent re-claim by the same application', async () => {
		const fixture = await createApplicationFixture(turkanaCountyId);
		const rawId = `NID-B-${Date.now()}`;

		const first = await identityRegistry.claim({
			rawIdentity: rawId,
			kind: IdentityKind.NATIONAL_ID,
			cycle: '2026',
			applicationId: fixture.applicationId,
			countyId: fixture.countyId,
		});
		expect(first.kind).toBe('CLAIMED');

		const retry = await identityRegistry.claim({
			rawIdentity: rawId,
			kind: IdentityKind.NATIONAL_ID,
			cycle: '2026',
			applicationId: fixture.applicationId,
			countyId: fixture.countyId,
		});
		expect(retry.kind).toBe('ALREADY_OWNED');
	});

	it('returns CONFLICT when a different county claims the same identity in the same cycle', async () => {
		const fxA = await createApplicationFixture(turkanaCountyId);
		const fxB = await createApplicationFixture(nakuruCountyId);
		const rawId = `NID-CROSS-${Date.now()}`;

		const aClaim = await identityRegistry.claim({
			rawIdentity: rawId,
			kind: IdentityKind.NATIONAL_ID,
			cycle: '2026',
			applicationId: fxA.applicationId,
			countyId: fxA.countyId,
		});
		expect(aClaim.kind).toBe('CLAIMED');

		const bClaim = await identityRegistry.claim({
			rawIdentity: rawId,
			kind: IdentityKind.NATIONAL_ID,
			cycle: '2026',
			applicationId: fxB.applicationId,
			countyId: fxB.countyId,
		});
		expect(bClaim.kind).toBe('CONFLICT');
		if (bClaim.kind === 'CONFLICT') {
			expect(bClaim.conflict.conflictingCountyId).toBe(turkanaCountyId);
			expect(bClaim.conflict.conflictingApplicationId).toBe(fxA.applicationId);
			expect(bClaim.conflict.conflictingCycle).toBe('2026');
		}
	});

	it('release() frees the slot so another county can claim in the same cycle', async () => {
		const fxA = await createApplicationFixture(turkanaCountyId);
		const fxB = await createApplicationFixture(nakuruCountyId);
		const rawId = `NID-RELEASE-${Date.now()}`;

		await identityRegistry.claim({
			rawIdentity: rawId,
			kind: IdentityKind.NATIONAL_ID,
			cycle: '2026',
			applicationId: fxA.applicationId,
			countyId: fxA.countyId,
		});

		await identityRegistry.release(fxA.applicationId);

		const bClaim = await identityRegistry.claim({
			rawIdentity: rawId,
			kind: IdentityKind.NATIONAL_ID,
			cycle: '2026',
			applicationId: fxB.applicationId,
			countyId: fxB.countyId,
		});
		expect(bClaim.kind).toBe('CLAIMED');
		if (bClaim.kind === 'CLAIMED') {
			// First-registered-county MUST still reflect the original (Turkana).
			expect(bClaim.result.firstRegisteredCountyId).toBe(turkanaCountyId);
			expect(bClaim.result.activeCountyId).toBe(nakuruCountyId);
		}
	});

	it('release() is idempotent and silent when no slot is held', async () => {
		// Releasing a non-existent application should not throw.
		await expect(
			identityRegistry.release('00000000-0000-0000-0000-000000000000'),
		).resolves.toBeUndefined();
	});

	it('syncStatus() releases the slot when the application leaves the active set', async () => {
		const fixture = await createApplicationFixture(turkanaCountyId);
		const rawId = `NID-SYNC-${Date.now()}`;

		await identityRegistry.claim({
			rawIdentity: rawId,
			kind: IdentityKind.NATIONAL_ID,
			cycle: '2026',
			applicationId: fixture.applicationId,
			countyId: fixture.countyId,
		});

		await identityRegistry.syncStatus(fixture.applicationId, ApplicationStatus.WITHDRAWN);

		const row = await prisma.identityRegistry.findFirst({
			where: { firstRegisteredCountyId: turkanaCountyId },
			orderBy: { firstRegisteredAt: 'desc' },
		});
		expect(row?.activeApplicationId).toBeNull();
		expect(row?.activeStatus).toBeNull();
		expect(row?.releasedAt).not.toBeNull();
	});
});
