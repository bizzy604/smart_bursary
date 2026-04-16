/**
 * Purpose: Host pure AI score mapping and filter helpers.
 * Why important: Keeps the main scoring service under the file-size limit and easier to test.
 * Used by: AiScoreService.
 */
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ApplicationStatus, Prisma, UserRole } from '@prisma/client';

type ScoreCardSelect = {
	totalScore: Prisma.Decimal;
	familyStatusScore: Prisma.Decimal | null;
	familyIncomeScore: Prisma.Decimal | null;
	educationBurdenScore: Prisma.Decimal | null;
	academicStandingScore: Prisma.Decimal | null;
	documentQualityScore: Prisma.Decimal | null;
	integrityScore: Prisma.Decimal | null;
	anomalyFlags: Prisma.JsonValue;
	documentAnalysis: Prisma.JsonValue;
	modelVersion: string | null;
	scoredAt: Date;
};

export function parseStatuses(raw?: string): ApplicationStatus[] {
	if (!raw) return [];
	const requested = raw.split(',').map((value) => value.trim().toUpperCase());
	const valid = requested.filter((status): status is ApplicationStatus =>
		Object.values(ApplicationStatus).includes(status as ApplicationStatus),
	);
	if (requested.length > 0 && valid.length === 0) {
		throw new BadRequestException('No valid application status filter provided.');
	}
	return valid;
}

export function assertWardScope(userRole: UserRole, userWardId: string | null, applicationWardId: string): void {
	if (userRole === UserRole.WARD_ADMIN && userWardId !== applicationWardId) {
		throw new ForbiddenException('Ward reviewer can only access scores in their ward.');
	}
}

export function mapScoreCard(applicationId: string, scoreCard: ScoreCardSelect) {
	const totalScore = toNumber(scoreCard.totalScore);
	const grade = totalScore >= 80 ? 'HIGH' : totalScore >= 50 ? 'MEDIUM' : 'LOW';
	return {
		applicationId,
		totalScore,
		grade,
		dimensions: {
			family_status: { score: toNumber(scoreCard.familyStatusScore), max: 25 },
			family_income: { score: toNumber(scoreCard.familyIncomeScore), max: 25 },
			education_burden: { score: toNumber(scoreCard.educationBurdenScore), max: 20 },
			academic_standing: { score: toNumber(scoreCard.academicStandingScore), max: 15 },
			document_quality: { score: toNumber(scoreCard.documentQualityScore), max: 10 },
			integrity: { score: toNumber(scoreCard.integrityScore), max: 5 },
		},
		anomalyFlags: scoreCard.anomalyFlags,
		documentAnalysis: scoreCard.documentAnalysis,
		modelVersion: scoreCard.modelVersion,
		scoredAt: scoreCard.scoredAt,
	};
}

export function toNumber(value: Prisma.Decimal | null): number {
	return value === null ? 0 : Number(value);
}
