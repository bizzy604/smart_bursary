/**
 * Purpose: Validate ward and county review decision guardrails.
 * Why important: Prevents invalid stage transitions and budget over-allocation.
 * Used by: Jest unit suite for review services.
 */
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';

import { CountyReviewService } from '../../modules/review/county-review.service';
import { CountyReviewDecision } from '../../modules/review/dto/county-review.dto';
import { WardReviewDecision } from '../../modules/review/dto/ward-review.dto';
import { WardReviewService } from '../../modules/review/ward-review.service';

describe('Review services', () => {
	it('rejects ward reviews from a different ward', async () => {
		const prisma = {
			application: { findFirst: jest.fn().mockResolvedValue({ id: 'app-1', status: 'WARD_REVIEW', wardId: 'ward-2', amountRequested: 40_000 }) },
		} as any;

		const service = new WardReviewService(prisma);

		await expect(
			service.submitWardReview('county-1', 'reviewer-1', 'ward-1', 'app-1', {
				decision: WardReviewDecision.RECOMMENDED,
				recommendedAmount: 20_000,
			}),
		).rejects.toBeInstanceOf(ForbiddenException);
	});

	it('rejects ward recommended amount above requested amount', async () => {
		const prisma = {
			application: { findFirst: jest.fn().mockResolvedValue({ id: 'app-1', status: 'WARD_REVIEW', wardId: 'ward-1', amountRequested: 15_000 }) },
		} as any;

		const service = new WardReviewService(prisma);

		await expect(
			service.submitWardReview('county-1', 'reviewer-1', 'ward-1', 'app-1', {
				decision: WardReviewDecision.RECOMMENDED,
				recommendedAmount: 20_000,
			}),
		).rejects.toBeInstanceOf(BadRequestException);
	});

	it('processes ward recommendation and returns COUNTY_REVIEW status', async () => {
		const tx = {
			applicationReview: { create: jest.fn().mockResolvedValue({ id: 'review-1' }) },
			application: { update: jest.fn().mockResolvedValue({}) },
			applicationTimeline: { create: jest.fn().mockResolvedValue({}) },
		};
		const prisma = {
			application: { findFirst: jest.fn().mockResolvedValue({ id: 'app-1', status: 'WARD_REVIEW', wardId: 'ward-1', amountRequested: 30_000 }) },
			$transaction: jest.fn(async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx)),
		} as any;

		const service = new WardReviewService(prisma);
		const result = await service.submitWardReview('county-1', 'reviewer-1', 'ward-1', 'app-1', {
			decision: WardReviewDecision.RECOMMENDED,
			recommendedAmount: 25_000,
		});

		expect(result.newStatus).toBe('COUNTY_REVIEW');
		expect(tx.application.update).toHaveBeenCalled();
		expect(tx.applicationTimeline.create).toHaveBeenCalled();
	});

	it('rejects county approval when budget ceiling would be exceeded', async () => {
		const tx = {
			$executeRaw: jest.fn().mockResolvedValue(undefined),
			bursaryProgram: { findUnique: jest.fn().mockResolvedValue({ allocatedTotal: 9_000, budgetCeiling: 10_000 }) },
			applicationReview: { create: jest.fn() },
			application: { update: jest.fn() },
			applicationTimeline: { create: jest.fn() },
		};
		const prisma = {
			application: { findFirst: jest.fn().mockResolvedValue({ id: 'app-1', status: 'COUNTY_REVIEW', programId: 'prog-1' }) },
			$transaction: jest.fn(async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx)),
		} as any;

		const service = new CountyReviewService(prisma);

		await expect(
			service.submitCountyReview('county-1', 'finance-1', 'app-1', {
				decision: CountyReviewDecision.APPROVED,
				allocatedAmount: 2_000,
			}),
		).rejects.toBeInstanceOf(ConflictException);
	});

	it('maps concurrent transaction errors to a retryable conflict', async () => {
		const prisma = {
			application: { findFirst: jest.fn().mockResolvedValue({ id: 'app-1', status: 'COUNTY_REVIEW', programId: 'prog-1' }) },
			$transaction: jest.fn().mockRejectedValue({ code: 'P2034' }),
		} as any;

		const service = new CountyReviewService(prisma);

		await expect(
			service.submitCountyReview('county-1', 'finance-1', 'app-1', {
				decision: CountyReviewDecision.WAITLISTED,
			}),
		).rejects.toBeInstanceOf(ConflictException);
	});
});
