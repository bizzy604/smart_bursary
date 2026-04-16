/**
 * Purpose: Define request/response contracts for disbursement endpoints.
 * Why important: Validates input and documents API contracts via Swagger.
 * Used by: DisbursementController.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsPhoneNumber, IsString, IsUUID } from 'class-validator';

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
		enum: ['MPESA_B2C', 'BANK_EFT', 'CHEQUE'],
	})
	@IsEnum(['MPESA_B2C', 'BANK_EFT', 'CHEQUE'])
	disbursementMethod!: 'MPESA_B2C' | 'BANK_EFT' | 'CHEQUE';

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
		enum: ['PENDING', 'SUCCESS', 'FAILED', 'REVERSED'],
	})
	@IsOptional()
	@IsString()
	status?: string;
}

export class UpdateTransactionStatusDto {
	@ApiProperty({
		description: 'Transaction status',
		example: 'SUCCESS',
		enum: ['SUCCESS', 'FAILED', 'PENDING', 'REVERSED'],
	})
	@IsEnum(['SUCCESS', 'FAILED', 'PENDING', 'REVERSED'])
	status!: 'SUCCESS' | 'FAILED' | 'PENDING' | 'REVERSED';

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
