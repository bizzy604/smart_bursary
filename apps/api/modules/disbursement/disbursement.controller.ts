/**
 * Purpose: Route disbursement requests to service, gate by role and county.
 * Why important: Finance officers initiate, track, and confirm payment execution.
 * Used by: Disbursement workflow in county review/approval phase.
 */
import {
	Body,
	Controller,
	Get,
	HttpCode,
	Param,
	Patch,
	Post,
	Query,
	Req,
	StreamableFile,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DisbursementExportService } from './disbursement-export.service';
import { DisbursementQueryService } from './disbursement-query.service';
import { DisbursementService } from './disbursement.service';
import { EftBatchDto } from './dto/eft-batch.dto';
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
	constructor(
		private readonly disbursementService: DisbursementService,
		private readonly disbursementQueryService: DisbursementQueryService,
		private readonly disbursementExportService: DisbursementExportService,
	) {}

	@Post()
	@HttpCode(202)
	@Roles(UserRole.FINANCE_OFFICER, UserRole.COUNTY_ADMIN)
	@ApiOperation({ summary: 'Initiate disbursement for an approved application' })
	async initiate(@Body() dto: InitiateDisbursementDto, @Req() req: any) {
		const result = await this.disbursementService.initiateDisbursement({
			applicationId: dto.applicationId,
			countyId: req.user.countyId,
			disbursementMethod: dto.disbursementMethod,
			recipientPhone: dto.recipientPhone,
			initiatedBy: req.user.userId,
		});
		return { success: true, data: result };
	}

	@Get()
	@Roles(UserRole.FINANCE_OFFICER, UserRole.COUNTY_ADMIN)
	@ApiOperation({ summary: 'List disbursements for county' })
	async list(@Req() req: any, @Query() query?: ListDisbursementsDto) {
		const disbursements = await this.disbursementQueryService.listDisbursements(
			req.user.countyId,
			{ status: query?.status },
		);
		return { success: true, data: disbursements };
	}

	@Post('batch/eft')
	@HttpCode(200)
	@Roles(UserRole.FINANCE_OFFICER, UserRole.COUNTY_ADMIN)
	@ApiOperation({ summary: 'Download EFT batch export in RTGS CSV format' })
	async exportEftBatch(@Req() req: any, @Body() dto: EftBatchDto) {
		const exportResult = await this.disbursementExportService.generateEftBatch(
			req.user.countyId,
			dto,
		);

		return new StreamableFile(exportResult.buffer, {
			type: 'text/csv; charset=utf-8',
			disposition: `attachment; filename="${exportResult.filename}"`,
		});
	}

	@Get('application/:applicationId/receipt')
	@Roles(UserRole.STUDENT, UserRole.FINANCE_OFFICER, UserRole.COUNTY_ADMIN)
	@ApiOperation({ summary: 'Download disbursement receipt by application id' })
	async downloadReceiptByApplication(
		@Param('applicationId') applicationId: string,
		@CurrentUser() user: Record<string, unknown>,
	) {
		const receipt = await this.disbursementQueryService.getReceiptByApplicationId(
			applicationId,
			{
				countyId: (user['countyId'] as string) ?? '',
				userId: user['userId'] as string,
				role: user['role'] as UserRole,
			},
		);

		return new StreamableFile(receipt.buffer, {
			type: 'application/pdf',
			disposition: `attachment; filename="${receipt.filename}"`,
		});
	}

	@Get(':disbursementId')
	@Roles(UserRole.FINANCE_OFFICER, UserRole.COUNTY_ADMIN)
	@ApiOperation({ summary: 'Get disbursement details' })
	async getDetail(@Param('disbursementId') disbursementId: string, @Req() req: any) {
		const detail = await this.disbursementQueryService.getDisbursementDetail(
			disbursementId,
			req.user.countyId,
		);
		return { success: true, data: detail };
	}

	@Get(':disbursementId/receipt')
	@Roles(UserRole.STUDENT, UserRole.FINANCE_OFFICER, UserRole.COUNTY_ADMIN)
	@ApiOperation({ summary: 'Download disbursement receipt by disbursement id' })
	async downloadReceiptByDisbursement(
		@Param('disbursementId') disbursementId: string,
		@CurrentUser() user: Record<string, unknown>,
	) {
		const receipt = await this.disbursementQueryService.getReceiptByDisbursementId(
			disbursementId,
			{
				countyId: (user['countyId'] as string) ?? '',
				userId: user['userId'] as string,
				role: user['role'] as UserRole,
			},
		);

		return new StreamableFile(receipt.buffer, {
			type: 'application/pdf',
			disposition: `attachment; filename="${receipt.filename}"`,
		});
	}

	@Post(':disbursementId/retry')
	@HttpCode(202)
	@Roles(UserRole.FINANCE_OFFICER, UserRole.COUNTY_ADMIN)
	@ApiOperation({ summary: 'Manually retry a failed disbursement' })
	async retry(@Param('disbursementId') disbursementId: string, @Req() req: any) {
		const result = await this.disbursementService.retryDisbursement(
			disbursementId,
			req.user.countyId,
		);
		return { success: true, data: result };
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
