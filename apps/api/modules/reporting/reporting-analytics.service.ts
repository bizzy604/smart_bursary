/**
 * Purpose: Build OCOB, ward export, and trend reporting datasets from live county data.
 * Why important: Closes reporting gaps with filterable, role-aware analytics outputs.
 * Used by: ReportingController export and historical analytics endpoints.
 */
import { Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { OcobReportService } from './ocob-report.service';
import { ReportScopeQueryDto, TrendReportQueryDto } from './dto/report-query.dto';

export type WardReportActor = {
	role: UserRole;
	wardId?: string | null;
	villageUnitId?: string | null;
};

@Injectable()
export class ReportingAnalyticsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly ocobReportService: OcobReportService,
	) {}

	async getOcobReport(countyId: string, scope: ReportScopeQueryDto) {
		const programs = await this.prisma.bursaryProgram.findMany({
			where: {
				countyId,
				...(scope.programId ? { id: scope.programId } : {}),
				...(scope.academicYear ? { academicYear: scope.academicYear } : {}),
			},
			select: {
				id: true,
				name: true,
				academicYear: true,
				budgetCeiling: true,
			},
		});
		if (programs.length === 0) {
			return { generatedAt: new Date().toISOString(), rows: [] };
		}

		const programIds = programs.map((program) => program.id);
		const applications = await this.prisma.application.findMany({
			where: {
				countyId,
				programId: { in: programIds },
				...(scope.wardId ? { wardId: scope.wardId } : {}),
			},
			select: { programId: true, status: true, amountAllocated: true },
		});
		const disbursements = await this.prisma.disbursementRecord.findMany({
			where: { countyId, programId: { in: programIds }, status: 'SUCCESS' },
			select: { programId: true, amountKes: true },
		});

		const disbursedByProgram = disbursements.reduce<Record<string, number>>((acc, entry) => {
			acc[entry.programId] = (acc[entry.programId] ?? 0) + Number(entry.amountKes);
			return acc;
		}, {});

		const rows = programs.map((program) => {
			const programApplications = applications.filter((entry) => entry.programId === program.id);
			const allocatedKes = programApplications.reduce((sum, entry) => {
				const isAwarded = entry.status === 'APPROVED' || entry.status === 'DISBURSED';
				return sum + (isAwarded ? Number(entry.amountAllocated ?? 0) : 0);
			}, 0);
			const approved = programApplications.filter(
				(entry) => entry.status === 'APPROVED' || entry.status === 'DISBURSED',
			).length;

			return {
				programId: program.id,
				programName: program.name,
				academicYear: program.academicYear ?? 'N/A',
				budgetCeilingKes: Number(program.budgetCeiling),
				applications: programApplications.length,
				approved,
				allocatedKes: Number(allocatedKes.toFixed(2)),
				disbursedKes: Number((disbursedByProgram[program.id] ?? 0).toFixed(2)),
				balanceKes: Number((allocatedKes - (disbursedByProgram[program.id] ?? 0)).toFixed(2)),
			};
		});

		return {
			generatedAt: new Date().toISOString(),
			rows: this.ocobReportService.buildRows(rows),
		};
	}

	async getWardSummary(countyId: string, scope: ReportScopeQueryDto, actor: WardReportActor) {
		const where: Prisma.ApplicationWhereInput = {
			countyId,
			status: { not: 'DRAFT' },
			...(scope.programId ? { programId: scope.programId } : {}),
			...(scope.academicYear ? { program: { academicYear: scope.academicYear } } : {}),
			...(actor.role === UserRole.VILLAGE_ADMIN && actor.villageUnitId
				? { applicant: { profile: { villageUnitId: actor.villageUnitId } } }
				: actor.role === UserRole.WARD_ADMIN && actor.wardId
					? { wardId: actor.wardId }
					: scope.wardId
						? { wardId: scope.wardId }
						: {}),
		};

		const applications = await this.prisma.application.findMany({
			where,
			include: {
				ward: { select: { name: true } },
				program: { select: { name: true, academicYear: true } },
				applicant: {
					select: {
						profile: { select: { fullName: true } },
						academicInfo: { select: { institutionType: true } },
					},
				},
				scoreCard: { select: { totalScore: true } },
				reviews: {
					orderBy: { reviewedAt: 'desc' },
					select: {
						stage: true,
						recommendedAmount: true,
						allocatedAmount: true,
						reviewedAt: true,
						reviewer: { select: { email: true, profile: { select: { fullName: true } } } },
					},
				},
			},
		});

		const rows = applications
			.filter((application) => this.matchesEducationLevel(application.applicant.academicInfo?.institutionType, scope.educationLevel))
			.map((application) => {
				const wardReview = application.reviews.find((review) => review.stage === 'WARD_REVIEW');
				const countyReview = application.reviews.find((review) => review.stage === 'COUNTY_REVIEW');
				const finalReview = countyReview ?? wardReview;
				return {
					applicationId: application.id,
					programId: application.programId,
					wardId: application.wardId,
					reference: application.submissionReference ?? application.id,
					applicantName: application.applicant.profile?.fullName ?? 'Unknown Applicant',
					wardName: application.ward.name,
					programName: application.program.name,
					academicYear: application.program.academicYear ?? 'N/A',
					educationLevel: application.applicant.academicInfo?.institutionType ?? 'N/A',
					status: application.status,
					aiScore: Number(application.scoreCard?.totalScore ?? 0),
					wardRecommendationKes: Number(wardReview?.recommendedAmount ?? 0),
					countyAllocationKes: Number(countyReview?.allocatedAmount ?? application.amountAllocated ?? 0),
					reviewerName: finalReview?.reviewer.profile?.fullName ?? finalReview?.reviewer.email ?? 'N/A',
					reviewerStage: finalReview?.stage ?? 'N/A',
					reviewedAt: finalReview?.reviewedAt?.toISOString() ?? null,
				};
			});

		return { generatedAt: new Date().toISOString(), rows };
	}

	async getVillageSummary(countyId: string, scope: ReportScopeQueryDto, actor: WardReportActor) {
		const where: Prisma.ApplicationWhereInput = {
			countyId,
			status: { not: 'DRAFT' },
			...(scope.programId ? { programId: scope.programId } : {}),
			...(scope.academicYear ? { program: { academicYear: scope.academicYear } } : {}),
			...(actor.role === UserRole.VILLAGE_ADMIN && actor.villageUnitId
				? { applicant: { profile: { villageUnitId: actor.villageUnitId } } }
				: scope.villageUnitId
					? { applicant: { profile: { villageUnitId: scope.villageUnitId } } }
					: {}),
		};

		const applications = await this.prisma.application.findMany({
			where,
			include: {
				ward: { select: { name: true } },
				program: { select: { name: true, academicYear: true } },
				applicant: {
					select: {
						profile: {
							select: {
								fullName: true,
								villageUnitId: true,
								villageUnit: {
									select: {
										name: true,
									},
								},
							},
						},
						academicInfo: { select: { institutionType: true } },
					},
				},
				scoreCard: { select: { totalScore: true } },
				reviews: {
					orderBy: { reviewedAt: 'desc' },
					select: {
						stage: true,
						recommendedAmount: true,
						allocatedAmount: true,
						reviewedAt: true,
						reviewer: { select: { email: true, profile: { select: { fullName: true } } } },
					},
				},
			},
		});

		const rows = applications
			.filter((application) => this.matchesEducationLevel(application.applicant.academicInfo?.institutionType, scope.educationLevel))
			.map((application) => {
				const wardReview = application.reviews.find((review) => review.stage === 'WARD_REVIEW');
				const countyReview = application.reviews.find((review) => review.stage === 'COUNTY_REVIEW');
				const finalReview = countyReview ?? wardReview;
				return {
					applicationId: application.id,
					programId: application.programId,
					villageUnitId: application.applicant.profile?.villageUnitId ?? null,
					wardId: application.wardId,
					reference: application.submissionReference ?? application.id,
					applicantName: application.applicant.profile?.fullName ?? 'Unknown Applicant',
					villageUnitName: application.applicant.profile?.villageUnit?.name ?? 'Unknown',
					wardName: application.ward.name,
					programName: application.program.name,
					academicYear: application.program.academicYear ?? 'N/A',
					educationLevel: application.applicant.academicInfo?.institutionType ?? 'N/A',
					status: application.status,
					aiScore: Number(application.scoreCard?.totalScore ?? 0),
					villageRecommendationKes: Number(wardReview?.recommendedAmount ?? 0),
					countyAllocationKes: Number(countyReview?.allocatedAmount ?? application.amountAllocated ?? 0),
					reviewerName: finalReview?.reviewer.profile?.fullName ?? finalReview?.reviewer.email ?? 'N/A',
					reviewerStage: finalReview?.stage ?? 'N/A',
					reviewedAt: finalReview?.reviewedAt?.toISOString() ?? null,
				};
			});

		return { generatedAt: new Date().toISOString(), rows };
	}

	async getTrendSummary(countyId: string, query: TrendReportQueryDto) {
		const rows = await this.getWardSummary(countyId, query, { role: UserRole.COUNTY_ADMIN });
		const trendMap = new Map<string, { total: number; approved: number; disbursed: number; allocatedKes: number; disbursedKes: number }>();

		for (const row of rows.rows) {
			const year = row.academicYear || 'N/A';
			const record = trendMap.get(year) ?? { total: 0, approved: 0, disbursed: 0, allocatedKes: 0, disbursedKes: 0 };
			record.total += 1;
			record.approved += row.status === 'APPROVED' || row.status === 'DISBURSED' ? 1 : 0;
			record.disbursed += row.status === 'DISBURSED' ? 1 : 0;
			record.allocatedKes += row.countyAllocationKes;
			record.disbursedKes += row.status === 'DISBURSED' ? row.countyAllocationKes : 0;
			trendMap.set(year, record);
		}

		const fromYear = query.fromYear;
		const toYear = query.toYear;
		const trends = [...trendMap.entries()]
			.filter(([year]) => {
				const parsed = Number.parseInt(year, 10);
				if (!Number.isFinite(parsed)) {
					return true;
				}
				if (fromYear && parsed < fromYear) {
					return false;
				}
				if (toYear && parsed > toYear) {
					return false;
				}
				return true;
			})
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([academicYear, totals]) => ({
				academicYear,
				totalApplications: totals.total,
				approvedApplications: totals.approved,
				disbursedApplications: totals.disbursed,
				allocatedKes: Number(totals.allocatedKes.toFixed(2)),
				disbursedKes: Number(totals.disbursedKes.toFixed(2)),
			}));

		return { generatedAt: new Date().toISOString(), trends };
	}

	private matchesEducationLevel(currentLevel: string | null | undefined, requestedLevel: string | undefined): boolean {
		if (!requestedLevel || !requestedLevel.trim()) {
			return true;
		}
		return (currentLevel ?? '').toUpperCase() === requestedLevel.trim().toUpperCase();
	}
}
