/**
 * Purpose: Expose county reporting APIs, including dashboard, exports, and trend analytics.
 * Why important: Finance and ward teams depend on these endpoints for OCOB and operational reporting.
 * Used by: Reporting dashboards, county/ward export screens, and analytics workflows.
 */
import { Controller, Get, Query, Req, StreamableFile, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ReportingService } from './reporting.service';
import { ReportingAnalyticsService } from './reporting-analytics.service';
import { ExportService } from './export.service';
import {
	ReportExportQueryDto,
	ReportScopeQueryDto,
	TrendReportQueryDto,
} from './dto/report-query.dto';

@ApiTags('Reporting')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportingController {
	constructor(
		private readonly reportingService: ReportingService,
		private readonly reportingAnalyticsService: ReportingAnalyticsService,
		private readonly exportService: ExportService,
	) {}

	@Get('dashboard')
	@Roles(UserRole.COUNTY_ADMIN, UserRole.FINANCE_OFFICER)
	@ApiOperation({ summary: 'Get dashboard summary for county' })
	async getDashboard(@Req() req: any) {
		const summary = await this.reportingService.getDashboardSummary(req.user.countyId);
		return { success: true, data: summary };
	}

	@Get('applications/by-status')
	@Roles(UserRole.COUNTY_ADMIN, UserRole.FINANCE_OFFICER)
	@ApiOperation({ summary: 'Get application counts by status' })
	async getApplicationsByStatus(@Req() req: any) {
		const summary = await this.reportingService.getApplicationsByStatus(req.user.countyId);
		return { success: true, data: summary };
	}

	@Get('disbursements')
	@Roles(UserRole.COUNTY_ADMIN, UserRole.FINANCE_OFFICER)
	@ApiOperation({ summary: 'Get disbursement report with success/failure counts' })
	async getDisbursementReport(
		@Req() req: any,
		@Query('limit') limit?: string,
	) {
		const report = await this.reportingService.getDisbursementReport(
			req.user.countyId,
			limit ? parseInt(limit) : 50,
		);
		return { success: true, data: report };
	}

	@Get('programs/awarded')
	@Roles(UserRole.COUNTY_ADMIN, UserRole.FINANCE_OFFICER)
	@ApiOperation({ summary: 'Get awards summary by program' })
	async getAwardedByProgram(@Req() req: any) {
		const awards = await this.reportingService.getAwardedByProgram(req.user.countyId);
		return { success: true, data: awards };
	}

	@Get('ocob')
	@Roles(UserRole.COUNTY_ADMIN, UserRole.FINANCE_OFFICER)
	@ApiOperation({ summary: 'Get OCOB reporting dataset' })
	async getOcobReport(@Req() req: any, @Query() query: ReportScopeQueryDto) {
		const report = await this.reportingAnalyticsService.getOcobReport(req.user.countyId, query);
		return { success: true, data: report };
	}

	@Get('ocob/export')
	@Roles(UserRole.COUNTY_ADMIN, UserRole.FINANCE_OFFICER)
	@ApiOperation({ summary: 'Download OCOB report as CSV or PDF' })
	async exportOcobReport(@Req() req: any, @Query() query: ReportExportQueryDto) {
		const report = await this.reportingAnalyticsService.getOcobReport(req.user.countyId, query);
		const headers = [
			'Program',
			'Academic Year',
			'Applications',
			'Approved',
			'Allocated (KES)',
			'Disbursed (KES)',
			'Balance (KES)',
		];
		const rows = report.rows.map((row) => [
			row.programName,
			row.academicYear,
			row.applications,
			row.approved,
			row.allocatedKes,
			row.disbursedKes,
			row.balanceKes,
		]);

		if (query.format === 'pdf') {
			const buffer = await this.exportService.toPdf({
				title: 'OCOB Financial Report',
				subtitle: `Generated ${report.generatedAt}`,
				headers,
				rows,
			});
			return new StreamableFile(buffer, {
				type: 'application/pdf',
				disposition: 'attachment; filename="ocob-report.pdf"',
			});
		}

		const buffer = this.exportService.toCsv(headers, rows);
		return new StreamableFile(buffer, {
			type: 'text/csv; charset=utf-8',
			disposition: 'attachment; filename="ocob-report.csv"',
		});
	}

	@Get('ward-summary')
	@Roles(UserRole.COUNTY_ADMIN, UserRole.FINANCE_OFFICER, UserRole.WARD_ADMIN)
	@ApiOperation({ summary: 'Get ward-level application reporting dataset' })
	async getWardSummary(@Req() req: any, @Query() query: ReportScopeQueryDto) {
		const report = await this.reportingAnalyticsService.getWardSummary(req.user.countyId, query, {
			role: req.user.role,
			wardId: req.user.wardId,
		});
		return { success: true, data: report };
	}

	@Get('ward-summary/export')
	@Roles(UserRole.COUNTY_ADMIN, UserRole.FINANCE_OFFICER, UserRole.WARD_ADMIN)
	@ApiOperation({ summary: 'Download ward-level application report as CSV or PDF' })
	async exportWardSummary(@Req() req: any, @Query() query: ReportExportQueryDto) {
		const report = await this.reportingAnalyticsService.getWardSummary(req.user.countyId, query, {
			role: req.user.role,
			wardId: req.user.wardId,
		});
		const headers = [
			'Reference',
			'Applicant',
			'Ward',
			'Program',
			'Academic Year',
			'Education Level',
			'AI Score',
			'Recommendation (KES)',
			'Allocation (KES)',
			'Reviewer',
			'Reviewer Stage',
			'Reviewed At',
		];
		const rows = report.rows.map((row) => [
			row.reference,
			row.applicantName,
			row.wardName,
			row.programName,
			row.academicYear,
			row.educationLevel,
			row.aiScore.toFixed(2),
			row.wardRecommendationKes,
			row.countyAllocationKes,
			row.reviewerName,
			row.reviewerStage,
			row.reviewedAt ?? '',
		]);

		if (query.format === 'pdf') {
			const buffer = await this.exportService.toPdf({
				title: 'Ward Summary Report',
				subtitle: `Generated ${report.generatedAt}`,
				headers,
				rows,
			});
			return new StreamableFile(buffer, {
				type: 'application/pdf',
				disposition: 'attachment; filename="ward-summary-report.pdf"',
			});
		}

		const buffer = this.exportService.toCsv(headers, rows);
		return new StreamableFile(buffer, {
			type: 'text/csv; charset=utf-8',
			disposition: 'attachment; filename="ward-summary-report.csv"',
		});
	}

	@Get('trends')
	@Roles(UserRole.COUNTY_ADMIN, UserRole.FINANCE_OFFICER)
	@ApiOperation({ summary: 'Get historical trends across intake cycles' })
	async getTrends(@Req() req: any, @Query() query: TrendReportQueryDto) {
		const trends = await this.reportingAnalyticsService.getTrendSummary(req.user.countyId, query);
		return { success: true, data: trends };
	}
}
