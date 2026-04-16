/**
 * Purpose: Provide AI score retrieval and ingestion workflows.
 * Why important: Connects AI scoring output to review queue progression and committee views.
 * Used by: AiController and InternalController endpoints.
 */
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ApplicationStatus, Prisma, UserRole } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ListProgramScoresDto } from './dto/list-program-scores.dto';
import { assertWardScope, mapScoreCard, parseStatuses } from './ai-score.helpers';

export type IngestAiScoreInput = {
	applicationId: string;
	countyId: string;
	totalScore: number;
	familyStatusScore?: number;
	familyIncomeScore?: number;
	educationBurdenScore?: number;
	academicStandingScore?: number;
	documentQualityScore?: number;
	integrityScore?: number;
	anomalyFlags?: unknown[];
	documentAnalysis?: Record<string, unknown>;
	weightsApplied: Record<string, number>;
	modelVersion?: string;
};

@Injectable()
export class AiScoreService {
	constructor(private readonly prisma: PrismaService) {}

	async getApplicationScore(
		countyId: string,
		userRole: UserRole,
		userWardId: string | null,
		applicationId: string,
	) {
		const application = await this.prisma.application.findFirst({
			where: { id: applicationId, countyId },
			select: {
				id: true,
				wardId: true,
				scoreCard: {
					select: {
						totalScore: true,
						familyStatusScore: true,
						familyIncomeScore: true,
						educationBurdenScore: true,
						academicStandingScore: true,
						documentQualityScore: true,
						integrityScore: true,
						anomalyFlags: true,
						documentAnalysis: true,
						modelVersion: true,
						scoredAt: true,
					},
				},
			},
		});

		if (!application) {
			throw new NotFoundException('Application not found.');
		}

		assertWardScope(userRole, userWardId, application.wardId);

		if (!application.scoreCard) {
			throw new NotFoundException('AI score card not found.');
		}

		return { data: mapScoreCard(application.id, application.scoreCard) };
	}

	async listProgramScores(
		countyId: string,
		userRole: UserRole,
		userWardId: string | null,
		programId: string,
		dto: ListProgramScoresDto,
	) {
		const statuses = parseStatuses(dto.status);
		let wardFilter = dto.wardId;

		if (userRole === UserRole.WARD_ADMIN) {
			if (!userWardId) {
				throw new ForbiddenException('Ward reviewer is missing ward assignment.');
			}
			if (dto.wardId && dto.wardId !== userWardId) {
				throw new ForbiddenException('Ward reviewer can only query their assigned ward.');
			}
			wardFilter = userWardId;
		}

		const rows = await this.prisma.application.findMany({
			where: {
				countyId,
				programId,
				scoreCard: { isNot: null },
				...(statuses.length > 0 && { status: { in: statuses } }),
				...(wardFilter && { wardId: wardFilter }),
			},
			select: {
				id: true,
				submissionReference: true,
				status: true,
				amountRequested: true,
				applicant: {
					select: {
						email: true,
						profile: { select: { fullName: true } },
					},
				},
				scoreCard: { select: { totalScore: true } },
			},
			orderBy: { scoreCard: { totalScore: 'desc' } },
		});

		return {
			data: rows.map((row) => ({
				applicationId: row.id,
				submissionReference: row.submissionReference,
				applicantName: row.applicant.profile?.fullName ?? row.applicant.email,
				totalScore: row.scoreCard ? Number(row.scoreCard.totalScore) : 0,
				status: row.status,
				amountRequested:
					row.amountRequested === null ? null : Number(row.amountRequested),
			})),
		};
	}

	async ingestScoreCard(input: IngestAiScoreInput) {
		const application = await this.prisma.application.findFirst({
			where: { id: input.applicationId, countyId: input.countyId },
			select: { id: true, countyId: true, status: true },
		});

		if (!application) {
			throw new NotFoundException('Application not found for AI scoring payload.');
		}

		return this.prisma.$transaction(async (tx) => {
			const scoreCard = await tx.aIScoreCard.upsert({
				where: { applicationId: input.applicationId },
				update: {
					totalScore: input.totalScore,
					familyStatusScore: input.familyStatusScore,
					familyIncomeScore: input.familyIncomeScore,
					educationBurdenScore: input.educationBurdenScore,
					academicStandingScore: input.academicStandingScore,
					documentQualityScore: input.documentQualityScore,
					integrityScore: input.integrityScore,
					anomalyFlags: (input.anomalyFlags ?? []) as Prisma.InputJsonValue,
					documentAnalysis: (input.documentAnalysis ?? {}) as Prisma.InputJsonValue,
					weightsApplied: input.weightsApplied as Prisma.InputJsonValue,
					modelVersion: input.modelVersion,
					scoredAt: new Date(),
				},
				create: {
					applicationId: input.applicationId,
					countyId: input.countyId,
					totalScore: input.totalScore,
					familyStatusScore: input.familyStatusScore,
					familyIncomeScore: input.familyIncomeScore,
					educationBurdenScore: input.educationBurdenScore,
					academicStandingScore: input.academicStandingScore,
					documentQualityScore: input.documentQualityScore,
					integrityScore: input.integrityScore,
					anomalyFlags: (input.anomalyFlags ?? []) as Prisma.InputJsonValue,
					documentAnalysis: (input.documentAnalysis ?? {}) as Prisma.InputJsonValue,
					weightsApplied: input.weightsApplied as Prisma.InputJsonValue,
					modelVersion: input.modelVersion,
				},
				select: { id: true },
			});

			const fromStatus = application.status;
			const toStatus = application.status === ApplicationStatus.SUBMITTED
				? ApplicationStatus.WARD_REVIEW
				: application.status;

			if (toStatus !== fromStatus) {
				await tx.application.update({
					where: { id: input.applicationId },
					data: { status: toStatus },
				});
			}

			await tx.applicationTimeline.create({
				data: {
					applicationId: input.applicationId,
					countyId: application.countyId,
					eventType: toStatus === fromStatus ? 'AI_SCORE_UPDATED' : 'AI_SCORED',
					fromStatus,
					toStatus,
					metadata: { totalScore: input.totalScore, modelVersion: input.modelVersion } as Prisma.InputJsonValue,
				},
			});

			return {
				scoreCardId: scoreCard.id,
				applicationStatus: toStatus,
			};
		});
	}
}
