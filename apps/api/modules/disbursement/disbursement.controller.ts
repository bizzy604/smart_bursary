/**
 * Purpose: Route disbursement requests to service, gate by role and county.
 * Why important: Finance officers initiate, track, and confirm payment execution.
 * Used by: Disbursement workflow in county review/approval phase.
 */
import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { DisbursementService } from './disbursement.service';
import {
	InitiateDisbursementDto,
	ListDisbursementsDto,
	UpdateTransactionStatusDto,
} from './dto/initiate-disbursement.dto';

@ApiTags('Disbursements')
@ApiBearerAuth()
@Controller('disbursements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DisbursementController {
	constructor(private readonly disbursementService: DisbursementService) {}

	@Post()
	@Roles(UserRole.FINANCE_OFFICER, UserRole.COUNTY_ADMIN)
	@ApiOperation({ summary: 'Initiate disbursement for an approved application' })
	async initiate(@Body() dto: InitiateDisbursementDto, @Req() req: any) {
		const result = await this.disbursementService.initiateDisbursement({
			applicationId: dto.applicationId,
			countyId: req.user.countyId,
			disbursementMethod: dto.disbursementMethod,
			recipientPhone: dto.recipientPhone,
			initiatedBy: req.user.sub,
		});
		return { success: true, data: result };
	}

	@Get()
	@Roles(UserRole.FINANCE_OFFICER, UserRole.COUNTY_ADMIN)
	@ApiOperation({ summary: 'List disbursements for county' })
	async list(@Req() req: any, @Body() query?: ListDisbursementsDto) {
		const disbursements = await this.disbursementService.listDisbursements(
			req.user.countyId,
			{ status: query?.status },
		);
		return { success: true, data: disbursements };
	}

	@Get(':disbursementId')
	@Roles(UserRole.FINANCE_OFFICER, UserRole.COUNTY_ADMIN)
	@ApiOperation({ summary: 'Get disbursement details' })
	async getDetail(@Param('disbursementId') disbursementId: string, @Req() req: any) {
		const detail = await this.disbursementService.getDisbursementDetail(
			disbursementId,
			req.user.countyId,
		);
		return { success: true, data: detail };
	}

	@Patch(':disbursementId/status')
	@Roles(UserRole.FINANCE_OFFICER)
	@ApiOperation({ summary: 'Update disbursement transaction status' })
	async updateStatus(
		@Param('disbursementId') disbursementId: string,
		@Body() dto: UpdateTransactionStatusDto,
		@Req() req: any,
	) {
		await this.disbursementService.updateTransactionStatus(
			disbursementId,
			dto.status,
			dto.transactionId,
			dto.failureReason,
		);
		return { success: true, message: 'Status updated' };
	}
}
