/**
 * Purpose: Aggregate reporting data for county dashboards and OCOB exports.
 * Why important: Finance officers and county admins need visibility into fund flow and outcomes.
 * Used by: ReportingController.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ReportingService {
	constructor(private readonly prisma: PrismaService) {}

	async getDashboardSummary(countyId: string) {
		const [totalApplications, approvedApplications, rejectedApplications, disbursedCount] =
			await Promise.all([
				this.prisma.application.count({
					where: { countyId, status: { not: 'DRAFT' } },
				}),
				this.prisma.application.count({
					where: { countyId, status: 'APPROVED' },
				}),
				this.prisma.application.count({
					where: { countyId, status: 'REJECTED' },
				}),
				this.prisma.disbursementRecord.count({
					where: { countyId, status: 'SUCCESS' },
				}),
			]);

		return {
			totalApplications,
			approvedApplications,
			rejectedApplications,
			disbursedCount,
			approvalRate: totalApplications > 0 ? ((approvedApplications / totalApplications) * 100).toFixed(2) : 0,
		};
	}

	async getApplicationsByStatus(countyId: string) {
		const statusCounts = await this.prisma.application.groupBy({
			by: ['status'],
			where: { countyId },
			_count: true,
		});

		return statusCounts.map((item) => ({
			status: item.status,
			count: item._count,
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
		const programs = await this.prisma.bursaryProgram.findMany({
			where: { countyId },
			select: {
				id: true,
				name: true,
				_count: {
					select: {
						applications: {
							where: { status: 'APPROVED' },
						},
					},
				},
			},
		});

		const result = [];
		for (const program of programs) {
			const totalAwarded = await this.prisma.application.aggregate({
				where: { programId: program.id, status: 'APPROVED' },
				_sum: {
					amountAllocated: true,
				},
			});

			result.push({
				programId: program.id,
				programName: program.name,
				awardedCount: program._count.applications,
				totalAwarded: Number(totalAwarded._sum.amountAllocated || 0),
			});
		}

		return result;
	}
}
