/**
 * Purpose: Define the internal payloads used for M-Pesa disbursement execution and callback handling.
 * Why important: Keeps Daraja request and response contracts explicit for the payment workflow.
 * Used by: MpesaService and future disbursement job processors.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class MpesaDisburseDto {
	@ApiProperty({ example: 'a6f57538-cb38-4fc0-b5f8-d225c7600e8e' })
	@IsUUID()
	applicationId!: string;

	@ApiProperty({ example: 'f1d27f9b-2fe2-4d02-9a8f-6b12f3d0d7e1' })
	@IsUUID()
	disbursementId!: string;

	@ApiProperty({ example: '254712345678' })
	@IsString()
	phoneNumber!: string;

	@ApiProperty({ example: 50000 })
	@IsInt()
	@Min(1)
	amountKes!: number;

	@ApiProperty({ example: 'DIS-2026-0001' })
	@IsString()
	reference!: string;
}

export class MpesaCallbackDto {
	@ApiProperty({ example: 'f1d27f9b-2fe2-4d02-9a8f-6b12f3d0d7e1' })
	@IsUUID()
	disbursementId!: string;

	@ApiProperty({ example: 'MPE123456789' })
	@IsString()
	transactionId!: string;

	@ApiProperty({ example: 0 })
	@IsInt()
	resultCode!: number;

	@ApiPropertyOptional({ example: 'Success' })
	@IsOptional()
	@IsString()
	resultDescription?: string;
}
