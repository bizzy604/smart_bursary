/**
 * Purpose: Provide pure helpers for dashboard and status aggregation formatting.
 * Why important: Keeps reporting calculations reusable and easy to unit test.
 * Used by: ReportingService and future reporting jobs.
 */
import { Injectable } from '@nestjs/common';

@Injectable()
export class DashboardService {
	calculateApprovalRate(totalApplications: number, approvedApplications: number): number {
		if (totalApplications <= 0) {
			return 0;
		}

		return Number(((approvedApplications / totalApplications) * 100).toFixed(2));
	}

	mapStatusCounts(statusCounts: Array<{ status: string; count: number }>): Record<string, number> {
		return statusCounts.reduce<Record<string, number>>((accumulator, item) => {
			accumulator[item.status] = item.count;
			return accumulator;
		}, {});
	}
}
