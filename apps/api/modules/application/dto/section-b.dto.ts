/**
 * Purpose: Validate Section B amounts and funding disclosure payload.
 * Why important: Preserves requested amounts plus HELB/prior bursary fields required by PRD acceptance.
 * Used by: SectionService when persisting application section data.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
	IsBoolean,
	IsInt,
	IsNotEmpty,
	IsOptional,
	IsString,
	MinLength,
	MaxLength,
	Min,
	ValidateIf,
} from 'class-validator';

export class SectionBDto {
	@ApiProperty({ example: 45000 })
	@IsInt()
	@Min(1)
	requestedKes!: number;

	@ApiProperty({ example: 60000 })
	@IsInt()
	@Min(0)
	feeBalanceKes!: number;

	@ApiProperty({ example: 120000 })
	@IsInt()
	@Min(0)
	totalFeeKes!: number;

	@ApiPropertyOptional({ example: 20000 })
	@IsOptional()
	@IsInt()
	@Min(0)
	sponsorSupportKes?: number;

	@ApiProperty({ example: true })
	@IsBoolean()
	helbApplied!: boolean;

	@ApiPropertyOptional({ example: 30000 })
	@ValidateIf((dto: SectionBDto) => dto.helbApplied)
	@IsInt()
	@Min(0)
	helbAmountKes?: number;

	@ApiProperty({ example: true })
	@IsBoolean()
	priorBursaryReceived!: boolean;

	@ApiPropertyOptional({ example: 'County Needy Students Fund 2025' })
	@ValidateIf((dto: SectionBDto) => dto.priorBursaryReceived)
	@IsString()
	@IsNotEmpty()
	@MaxLength(255)
	priorBursarySource?: string;

	@ApiPropertyOptional({ example: 15000 })
	@ValidateIf((dto: SectionBDto) => dto.priorBursaryReceived)
	@IsInt()
	@Min(0)
	priorBursaryAmountKes?: number;

	@ApiProperty({
		example: 'My guardian cannot sustain current fee arrears after loss of income this term.',
	})
	@IsString()
	@IsNotEmpty()
	@MinLength(20)
	@MaxLength(2000)
	reasonForSupport!: string;
}
