/**
 * Purpose: Handle ward-level review decisions and state transitions.
 * Why important: Keeps ward committee business rules out of transport controllers.
 * Used by: ReviewController ward review endpoint.
 */
import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { ApplicationStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { WardReviewDecision, WardReviewDto } from './dto/ward-review.dto';

@Injectable()
export class WardReviewService {
	constructor(private readonly prisma: PrismaService) {}

	async submitWardReview(
		countyId: string,
		reviewerId: string,
		reviewerWardId: string | null,
		applicationId: string,
		dto: WardReviewDto,
	) {
		const application = await this.prisma.application.findFirst({
			where: { id: applicationId, countyId },
			select: {
				id: true,
				status: true,
				wardId: true,
				amountRequested: true,
			},
		});

		if (!application) {
			throw new NotFoundException('Application not found.');
		}

		if (application.status !== ApplicationStatus.WARD_REVIEW) {
			throw new BadRequestException('Application is not in WARD_REVIEW stage.');
		}

		if (!reviewerWardId || reviewerWardId !== application.wardId) {
			throw new ForbiddenException('Ward reviewers can only review applications in their ward.');
		}

		const requestedAmount = application.amountRequested
			? Number(application.amountRequested)
			: null;

		if (
			dto.decision === WardReviewDecision.RECOMMENDED &&
			requestedAmount !== null &&
			dto.recommendedAmount !== undefined &&
			dto.recommendedAmount > requestedAmount
		) {
			throw new BadRequestException('Recommended amount cannot exceed requested amount.');
		}

		const nextStatus = this.resolveNextStatus(dto.decision);
		const eventType = this.resolveEventType(dto.decision);

		const result = await this.prisma.$transaction(async (tx) => {
			const review = await tx.applicationReview.create({
				data: {
					applicationId,
					countyId,
					reviewerId,
					stage: 'WARD_REVIEW',
					decision: dto.decision,
					recommendedAmount: dto.recommendedAmount,
					note: dto.note,
				},
				select: { id: true },
			});

			if (nextStatus !== application.status) {
				await tx.application.update({
					where: { id: applicationId },
					data: { status: nextStatus },
				});
			}

			const metadata: Record<string, unknown> = {
				decision: dto.decision,
				reviewId: review.id,
			};
			if (dto.recommendedAmount !== undefined) {
				metadata.recommendedAmount = dto.recommendedAmount;
			}
			if (dto.note) {
				metadata.note = dto.note;
			}

			await tx.applicationTimeline.create({
				data: {
					applicationId,
					countyId,
					actorId: reviewerId,
					eventType,
					fromStatus: application.status,
					toStatus: nextStatus,
					metadata: metadata as Prisma.InputJsonValue,
				},
			});

			return review;
		});

		return {
			reviewId: result.id,
			decision: dto.decision,
			newStatus: nextStatus,
		};
	}

	private resolveNextStatus(decision: WardReviewDecision): ApplicationStatus {
		if (decision === WardReviewDecision.RECOMMENDED) {
			return ApplicationStatus.COUNTY_REVIEW;
		}
		if (decision === WardReviewDecision.REJECTED) {
			return ApplicationStatus.REJECTED;
		}
		return ApplicationStatus.WARD_REVIEW;
	}

	private resolveEventType(decision: WardReviewDecision): string {
		if (decision === WardReviewDecision.RECOMMENDED) {
			return 'WARD_REVIEW_RECOMMENDED';
		}
		if (decision === WardReviewDecision.REJECTED) {
			return 'WARD_REVIEW_REJECTED';
		}
		return 'WARD_REVIEW_RETURNED';
	}
}
