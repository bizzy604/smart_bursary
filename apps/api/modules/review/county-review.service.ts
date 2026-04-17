/**
 * Purpose: Handle county-level allocation decisions and budget enforcement.
 * Why important: Protects financial integrity by preventing budget over-allocation.
 * Used by: ReviewController county review endpoint.
 */
import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { ApplicationStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { NotificationLifecycleService } from '../notification/notification-lifecycle.service';
import { CountyReviewDecision, CountyReviewDto } from './dto/county-review.dto';

@Injectable()
export class CountyReviewService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly notificationLifecycleService: NotificationLifecycleService,
	) {}

	async submitCountyReview(
		countyId: string,
		reviewerId: string,
		applicationId: string,
		dto: CountyReviewDto,
	) {
		const application = await this.prisma.application.findFirst({
			where: { id: applicationId, countyId },
			select: {
				id: true,
				status: true,
				programId: true,
			},
		});

		if (!application) {
			throw new NotFoundException('Application not found.');
		}

		if (application.status !== ApplicationStatus.COUNTY_REVIEW) {
			throw new BadRequestException('Application is not in COUNTY_REVIEW stage.');
		}

		const nextStatus = this.resolveNextStatus(dto.decision);
		const eventType = this.resolveEventType(dto.decision);

		try {
			const result = await this.prisma.$transaction(
				async (tx) => {
					let budgetRemaining: number | null = null;

					if (dto.decision === CountyReviewDecision.APPROVED) {
						await tx.$executeRaw`
							SELECT pg_advisory_xact_lock(hashtext(${application.programId}), 0)
						`;

						const program = await tx.bursaryProgram.findUnique({
							where: { id: application.programId },
							select: { allocatedTotal: true, budgetCeiling: true },
						});

						if (!program) {
							throw new NotFoundException('Program not found for this application.');
						}

						const requestedAllocation = dto.allocatedAmount ?? 0;
						const currentAllocated = Number(program.allocatedTotal);
						const ceiling = Number(program.budgetCeiling);

						if (currentAllocated + requestedAllocation > ceiling) {
							throw new ConflictException('Budget exhausted: allocation exceeds program ceiling.');
						}

						const updatedProgram = await tx.bursaryProgram.update({
							where: { id: application.programId },
							data: {
								allocatedTotal: { increment: requestedAllocation },
							},
							select: { allocatedTotal: true, budgetCeiling: true },
						});

						budgetRemaining =
							Number(updatedProgram.budgetCeiling) - Number(updatedProgram.allocatedTotal);
					}

					const review = await tx.applicationReview.create({
						data: {
							applicationId,
							countyId,
							reviewerId,
							stage: 'COUNTY_REVIEW',
							decision: dto.decision,
							allocatedAmount: dto.allocatedAmount,
							note: dto.note,
						},
						select: { id: true },
					});

					await tx.application.update({
						where: { id: applicationId },
						data: {
							status: nextStatus,
							amountAllocated:
								dto.decision === CountyReviewDecision.APPROVED
									? dto.allocatedAmount
									: null,
						},
					});

					const metadata: Record<string, unknown> = {
						decision: dto.decision,
						reviewId: review.id,
					};
					if (dto.allocatedAmount !== undefined) {
						metadata.allocatedAmount = dto.allocatedAmount;
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

					return {
						reviewId: review.id,
						decision: dto.decision,
						allocatedAmount: dto.allocatedAmount ?? null,
						newStatus: nextStatus,
						budgetRemaining,
					};
				},
				{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
			);

			await this.notificationLifecycleService.queueStatusChange({
				countyId,
				applicationId,
				eventType,
				fromStatus: application.status,
				toStatus: result.newStatus,
				metadata: {
					decision: dto.decision,
					reviewId: result.reviewId,
					allocatedAmount: result.allocatedAmount,
				},
			});

			return result;
		} catch (error: unknown) {
			const prismaError = error as { code?: string };
			if (prismaError.code === 'P2034') {
				throw new ConflictException('Concurrent budget decision detected. Please retry.');
			}
			throw error;
		}
	}

	private resolveNextStatus(decision: CountyReviewDecision): ApplicationStatus {
		if (decision === CountyReviewDecision.APPROVED) {
			return ApplicationStatus.APPROVED;
		}
		if (decision === CountyReviewDecision.REJECTED) {
			return ApplicationStatus.REJECTED;
		}
		return ApplicationStatus.WAITLISTED;
	}

	private resolveEventType(decision: CountyReviewDecision): string {
		if (decision === CountyReviewDecision.APPROVED) {
			return 'COUNTY_REVIEW_APPROVED';
		}
		if (decision === CountyReviewDecision.REJECTED) {
			return 'COUNTY_REVIEW_REJECTED';
		}
		return 'COUNTY_REVIEW_WAITLISTED';
	}
}
