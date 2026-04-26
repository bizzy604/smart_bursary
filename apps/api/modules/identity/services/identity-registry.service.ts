/**
 * Purpose: Cross-county active-cycle identity registry service (§5.3 L2 of design doc).
 * Why important: Implements the platform-scoped HMAC-indexed lookup that prevents Type-C
 *                ghost students (one identity claiming applications in multiple counties
 *                during the same intake cycle). Stores ONLY HMAC-SHA256 hashes — never
 *                plaintext national IDs / birth certs — preserving the same data-minimisation
 *                posture as `student_profiles.national_id` (which is pgcrypto-encrypted).
 * Used by: ApplicationSubmissionService (next commit) for `claim` at submit-time, and the
 *          withdraw / reject paths for `release`. Also queried by AI anomaly detection (L6).
 */
import { Injectable, Logger } from '@nestjs/common';
import { ApplicationStatus } from '@prisma/client';
import { createHmac } from 'node:crypto';

import { PrismaService } from '../../../database/prisma.service';
import {
	IdentityClaimOutcome,
	IdentityClaimRequest,
	IdentityClaimResult,
	IdentityKind,
} from '../dto/identity-claim.types';

/**
 * Statuses that count as "the slot is currently taken". Aligned with §5.3 L2:
 * WITHDRAWN and REJECTED exit the lock so a legitimate mover can re-apply elsewhere.
 */
const ACTIVE_STATUSES: ReadonlySet<ApplicationStatus> = new Set([
	ApplicationStatus.SUBMITTED,
	ApplicationStatus.WARD_REVIEW,
	ApplicationStatus.WARD_DISTRIBUTION_PENDING,
	ApplicationStatus.VILLAGE_ALLOCATION_PENDING,
	ApplicationStatus.ALLOCATED,
	ApplicationStatus.COUNTY_REVIEW,
	ApplicationStatus.APPROVED,
	ApplicationStatus.WAITLISTED,
	ApplicationStatus.DISBURSED,
]);

@Injectable()
export class IdentityRegistryService {
	private readonly logger = new Logger(IdentityRegistryService.name);
	private readonly hmacSecret: string;

	constructor(private readonly prisma: PrismaService) {
		// In production this MUST come from AWS Secrets Manager / KMS via the config layer.
		// Falls back to a deterministic dev value so local seeds and tests work offline.
		this.hmacSecret =
			process.env.IDENTITY_HASH_SECRET ??
			'dev-only-identity-hmac-secret-CHANGE-IN-PRODUCTION';

		if (
			process.env.NODE_ENV === 'production' &&
			!process.env.IDENTITY_HASH_SECRET
		) {
			// Hard-fail in prod if the secret isn't injected; the dev fallback is unsafe at scale.
			throw new Error(
				'IDENTITY_HASH_SECRET environment variable is required in production.',
			);
		}
	}

	/**
	 * Compute the canonical HMAC for an identity value. Normalisation:
	 *   - trim whitespace
	 *   - upper-case (for alphanumeric birth certs)
	 *   - strip non-alphanumeric chars (handles "12 345 678" or "ID/12345678/2024" variants)
	 * The kind discriminator is folded into the HMAC input so a national_id "12345678" and a
	 * NEMIS UPI "12345678" cannot collide.
	 */
	computeIdentityHash(rawIdentity: string, kind: IdentityKind): Uint8Array<ArrayBuffer> {
		const normalised = rawIdentity.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
		if (!normalised) {
			throw new Error('Identity value is empty after normalisation.');
		}
		const hmac = createHmac('sha256', this.hmacSecret);
		hmac.update(`${kind}:${normalised}`);
		// Prisma 6 requires Uint8Array<ArrayBuffer> for Bytes columns; Node's
		// hmac.digest() returns Buffer<ArrayBufferLike> which TS rejects. Uint8Array.from
		// produces a fresh ArrayBuffer-backed copy that matches Prisma's exact type.
		return Uint8Array.from(hmac.digest());
	}

	/**
	 * Attempt to claim an active-cycle slot for an identity. Returns one of:
	 *   - CLAIMED: the slot was free and we wrote a new row.
	 *   - ALREADY_OWNED: the same application already owns the slot (idempotent re-claim).
	 *   - CONFLICT: another county already holds the slot for this identity in this cycle.
	 *
	 * The caller (ApplicationSubmissionService) is responsible for translating CONFLICT
	 * into a 409 with a structured payload identifying the existing county.
	 */
	async claim(req: IdentityClaimRequest): Promise<IdentityClaimOutcome> {
		const hash = this.computeIdentityHash(req.rawIdentity, req.kind);

		// Read existing slot first; we want to differentiate between idempotent re-claims
		// and real conflicts before writing.
		const existing = await this.prisma.identityRegistry.findUnique({
			where: { identityHash: hash },
		});

		if (existing) {
			const sameApplication = existing.activeApplicationId === req.applicationId;
			const sameCycle = existing.activeCycle === req.cycle;
			const stillActive =
				existing.activeStatus !== null && ACTIVE_STATUSES.has(existing.activeStatus);

			if (sameApplication) {
				// Idempotent: same application re-claims its own slot. Refresh the row.
				const updated = await this.prisma.identityRegistry.update({
					where: { identityHash: hash },
					data: {
						activeCountyId: req.countyId,
						activeCycle: req.cycle,
						activeStatus: ApplicationStatus.SUBMITTED,
						releasedAt: null,
					},
				});
				return { kind: 'ALREADY_OWNED', result: this.toResult(updated) };
			}

			if (sameCycle && stillActive) {
				// Different application, same cycle, still active → conflict.
				return {
					kind: 'CONFLICT',
					conflict: {
						identityHashHex: Buffer.from(hash).toString('hex'),
						conflictingCountyId: existing.activeCountyId,
						conflictingApplicationId: existing.activeApplicationId,
						conflictingCycle: existing.activeCycle,
					},
				};
			}

			// Cycle has rolled over or previous slot was released → take it.
			const updated = await this.prisma.identityRegistry.update({
				where: { identityHash: hash },
				data: {
					activeApplicationId: req.applicationId,
					activeCountyId: req.countyId,
					activeCycle: req.cycle,
					activeStatus: ApplicationStatus.SUBMITTED,
					releasedAt: null,
				},
			});
			return { kind: 'CLAIMED', result: this.toResult(updated) };
		}

		// First time we've seen this identity — fresh row.
		const created = await this.prisma.identityRegistry.create({
			data: {
				identityHash: hash,
				activeApplicationId: req.applicationId,
				activeCountyId: req.countyId,
				activeCycle: req.cycle,
				activeStatus: ApplicationStatus.SUBMITTED,
				firstRegisteredCountyId: req.countyId,
			},
		});
		return { kind: 'CLAIMED', result: this.toResult(created) };
	}

	/**
	 * Release the active slot held by an application. Called when an application is
	 * WITHDRAWN or REJECTED so the student can legitimately apply elsewhere in the same cycle.
	 * Idempotent: releasing an already-released slot is a no-op.
	 */
	async release(applicationId: string): Promise<void> {
		const existing = await this.prisma.identityRegistry.findUnique({
			where: { activeApplicationId: applicationId },
		});
		if (!existing) {
			this.logger.debug(`No identity_registry row holds application ${applicationId}; nothing to release.`);
			return;
		}

		await this.prisma.identityRegistry.update({
			where: { identityHash: existing.identityHash },
			data: {
				activeApplicationId: null,
				activeStatus: null,
				releasedAt: new Date(),
			},
		});
	}

	/**
	 * Reflect an application status change onto the registry row. Called by the
	 * status-machine integration (Commit 7+) so the registry's view of "is this slot
	 * active" stays consistent with the application's lifecycle.
	 */
	async syncStatus(applicationId: string, newStatus: ApplicationStatus): Promise<void> {
		const existing = await this.prisma.identityRegistry.findUnique({
			where: { activeApplicationId: applicationId },
		});
		if (!existing) return;

		// If the new status is non-active, release the slot.
		if (!ACTIVE_STATUSES.has(newStatus)) {
			await this.release(applicationId);
			return;
		}

		await this.prisma.identityRegistry.update({
			where: { identityHash: existing.identityHash },
			data: { activeStatus: newStatus },
		});
	}

	private toResult(row: {
		identityHash: Uint8Array;
		activeApplicationId: string | null;
		activeCountyId: string;
		activeCycle: string;
		firstRegisteredCountyId: string;
		firstRegisteredAt: Date;
	}): IdentityClaimResult {
		return {
			identityHashHex: Buffer.from(row.identityHash).toString('hex'),
			activeApplicationId: row.activeApplicationId ?? '',
			activeCountyId: row.activeCountyId,
			activeCycle: row.activeCycle,
			firstRegisteredCountyId: row.firstRegisteredCountyId,
			firstRegisteredAt: row.firstRegisteredAt,
		};
	}
}
