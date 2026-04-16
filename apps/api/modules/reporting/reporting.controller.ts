/**
 * Purpose: Route reporting requests to service, gate by role and county.
 * Why important: County admins and finance officers need visibility into program performance.
 * Used by: Reporting and analytics workflow.
 */
import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ReportingService } from './reporting.service';

@ApiTags('Reporting')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportingController {
	constructor(private readonly reportingService: ReportingService) {}

	@Get('dashboard')
	@Roles(UserRole.COUNTY_ADMIN, UserRole.FINANCE_OFFICER)
	@ApiOperation({ summary: 'Get dashboard summary for county' })
	async getDashboard(@Req() req: any) {
		const summary = await this.reportingService.getDashboardSummary(req.user.countyId);
		return { success: true, data: summary };
	}

	@Get('applications/by-status')
	@Roles(UserRole.COUNTY_ADMIN, UserRole.FINANCE_OFFICER, UserRole.WARD_ADMIN)
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
}
