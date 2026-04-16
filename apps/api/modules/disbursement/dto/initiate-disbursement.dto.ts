/**
 * Purpose: Define request/response contracts for disbursement endpoints.
 * Why important: Validates input and documents API contracts via Swagger.
 * Used by: DisbursementController.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsPhoneNumber, IsString, IsUUID } from 'class-validator';

export enum DisbursementMethodDto {
	MPESA_B2C = 'MPESA_B2C',
	BANK_EFT = 'BANK_EFT',
	CHEQUE = 'CHEQUE',
}

export enum DisbursementStatusDto {
	PENDING = 'PENDING',
	SUCCESS = 'SUCCESS',
	FAILED = 'FAILED',
	REVERSED = 'REVERSED',
}

export class InitiateDisbursementDto {
	@ApiProperty({
		description: 'Application ID approved for disbursement',
		example: 'a6f57538-cb38-4fc0-b5f8-d225c7600e8e',
	})
	@IsUUID()
	applicationId!: string;

	@ApiProperty({
		description: 'Disbursement method',
		example: 'MPESA_B2C',
		enum: DisbursementMethodDto,
	})
	@IsEnum(DisbursementMethodDto)
	disbursementMethod!: DisbursementMethodDto;

	@ApiPropertyOptional({
		description: 'Recipient phone number (overrides applicant phone)',
		example: '+254700000001',
	})
	@IsOptional()
	@IsPhoneNumber('KE')
	recipientPhone?: string;
}

export class ListDisbursementsDto {
	@ApiPropertyOptional({
		description: 'Filter by disbursement status',
		example: 'PENDING',
		enum: DisbursementStatusDto,
	})
	@IsOptional()
	@IsEnum(DisbursementStatusDto)
	status?: DisbursementStatusDto;
}

export class UpdateTransactionStatusDto {
	@ApiProperty({
		description: 'Transaction status',
		example: 'SUCCESS',
		enum: DisbursementStatusDto,
	})
	@IsEnum(DisbursementStatusDto)
	status!: DisbursementStatusDto;

	@ApiPropertyOptional({
		description: 'External transaction ID from payment provider',
		example: 'MPE123456789',
	})
	@IsOptional()
	@IsString()
	transactionId?: string;

	@ApiPropertyOptional({
		description: 'Reason for failure if status is FAILED',
		example: 'Invalid phone number',
	})
	@IsOptional()
	@IsString()
	failureReason?: string;
}
