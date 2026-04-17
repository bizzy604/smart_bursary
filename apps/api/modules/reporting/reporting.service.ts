/**
 * Purpose: Aggregate reporting data for county dashboards and OCOB exports.
 * Why important: Finance officers and county admins need visibility into fund flow and outcomes.
 * Used by: ReportingController.
 */
import { Injectable } from '@nestjs/common';
import { ApplicationStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ReportingService {
	constructor(private readonly prisma: PrismaService) {}

	async getDashboardSummary(countyId: string) {
		const [programs, wards, applications, disbursements] = await Promise.all([
			this.prisma.bursaryProgram.findMany({
				where: { countyId },
				select: {
					id: true,
					name: true,
					budgetCeiling: true,
					allocatedTotal: true,
					disbursedTotal: true,
				},
			}),
			this.prisma.ward.findMany({ where: { countyId }, select: { id: true, name: true } }),
			this.prisma.application.findMany({
				where: { countyId },
				select: {
					programId: true,
					wardId: true,
					status: true,
					amountAllocated: true,
				},
			}),
			this.prisma.disbursementRecord.findMany({
				where: { countyId, status: 'SUCCESS' },
				select: { id: true },
			}),
		]);

		const totalApplications = applications.filter((app) => app.status !== 'DRAFT').length;
		const approvedApplications = applications.filter(
			(app) => app.status === 'APPROVED' || app.status === 'DISBURSED',
		).length;
		const rejectedApplications = applications.filter((app) => app.status === 'REJECTED').length;
		const disbursedCount = disbursements.length;

		const statuses = [
			'DRAFT',
			'SUBMITTED',
			'WARD_REVIEW',
			'COUNTY_REVIEW',
			'APPROVED',
			'REJECTED',
			'DISBURSED',
			'WAITLISTED',
		] as const;
		const wardNames = wards.reduce<Record<string, string>>((acc, ward) => {
			acc[ward.id] = ward.name;
			return acc;
		}, {});
		const wardBreakdown = applications.reduce<Record<string, { applications: number; approved: number; allocated_kes: number }>>((acc, app) => {
			const wardName = wardNames[app.wardId] ?? 'Unknown Ward';
			const current = acc[wardName] ?? { applications: 0, approved: 0, allocated_kes: 0 };
			if (app.status !== 'DRAFT') {
				current.applications += 1;
			}
			if (app.status === 'APPROVED' || app.status === 'DISBURSED') {
				current.approved += 1;
				current.allocated_kes += Number(app.amountAllocated ?? 0);
			}
			acc[wardName] = current;
			return acc;
		}, {});

		const programRows = programs.map((program) => {
			const statusCounts = statuses.reduce<Record<string, number>>((acc, status) => {
				acc[status] = 0;
				return acc;
			}, {});
			for (const app of applications) {
				if (app.programId === program.id) {
					statusCounts[app.status] = (statusCounts[app.status] ?? 0) + 1;
				}
			}

			const budgetCeiling = Number(program.budgetCeiling);
			const allocatedTotal = Number(program.allocatedTotal);
			const disbursedTotal = Number(program.disbursedTotal);
			return {
				id: program.id,
				name: program.name,
				budget_ceiling: budgetCeiling,
				allocated_total: allocatedTotal,
				disbursed_total: disbursedTotal,
				utilization_pct:
					budgetCeiling > 0 ? Number(((allocatedTotal / budgetCeiling) * 100).toFixed(2)) : 0,
				applications_by_status: statusCounts,
			};
		});

		return {
			totalApplications,
			approvedApplications,
			rejectedApplications,
			disbursedCount,
			as_of: new Date().toISOString(),
			programs: programRows,
			ward_breakdown: Object.entries(wardBreakdown).map(([ward_name, summary]) => ({
				ward_name,
				applications: summary.applications,
				approved: summary.approved,
				allocated_kes: Number(summary.allocated_kes.toFixed(2)),
			})),
			approvalRate: totalApplications > 0 ? Number(((approvedApplications / totalApplications) * 100).toFixed(2)) : 0,
		};
	}

	async getApplicationsByStatus(countyId: string) {
		const statusCounts = await this.prisma.application.groupBy({
			by: ['status'],
			where: { countyId },
			_count: { _all: true },
		});

		return statusCounts.map((item) => ({
			status: item.status,
			count: item._count._all,
		}));
	}

	async getDisbursementReport(countyId: string, limit = 50) {
		const disbursements = await this.prisma.disbursementRecord.findMany({
			where: { countyId },
			include: {
				application: {
					select: {
						applicant: {
							select: {
								profile: { select: { fullName: true } },
							},
						},
					},
				},
			},
			orderBy: { initiatedAt: 'desc' },
			take: limit,
		});

		return disbursements.map((d) => ({
			disbursementId: d.id,
			status: d.status,
			disbursementMethod: d.disbursementMethod,
			amount: Number(d.amountKes),
			recipientName: d.application?.applicant?.profile?.fullName || 'Unknown',
			initiatedAt: d.initiatedAt,
			confirmedAt: d.confirmedAt,
		}));
	}

	async getAwardedByProgram(countyId: string) {
		const awardedStatuses: ApplicationStatus[] = ['APPROVED', 'DISBURSED'];
		const programs = await this.prisma.bursaryProgram.findMany({
			where: { countyId },
			select: {
				id: true,
				name: true,
				_count: {
					select: {
						applications: {
							where: { status: { in: awardedStatuses } },
						},
					},
				},
			},
		});

		const result = [];
		for (const program of programs) {
			const totalAwarded = await this.prisma.application.aggregate({
				where: { programId: program.id, status: { in: awardedStatuses } },
				_sum: {
					amountAllocated: true,
				},
			});

			result.push({
				programId: program.id,
				programName: program.name,
				awardedCount: program._count.applications,
				totalAwarded: Number(totalAwarded._sum?.amountAllocated || 0),
			});
		}

		return result;
	}
}
