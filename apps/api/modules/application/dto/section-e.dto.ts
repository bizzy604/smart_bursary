/**
 * Purpose: Validate Section E disclosures and declaration payload.
 * Why important: Preserves disclosure attestations and verification consent required for lawful processing.
 * Used by: SectionService when persisting application section data.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
	Equals,
	IsBoolean,
	IsNotEmpty,
	IsOptional,
	IsString,
	MaxLength,
	ValidateIf,
} from 'class-validator';

export class SectionEDto {
	@ApiProperty({ example: false })
	@IsBoolean()
	hasOtherBursary!: boolean;

	@ApiPropertyOptional({ example: 'Receiving KES 10,000 from church scholarship.' })
	@ValidateIf((dto: SectionEDto) => dto.hasOtherBursary)
	@IsString()
	@IsNotEmpty()
	@MaxLength(1000)
	otherBursaryDetails?: string;

	@ApiProperty({ example: true })
	@IsBoolean()
	hasDisabilityNeeds!: boolean;

	@ApiPropertyOptional({ example: 'Requires assistive learning support and transport subsidy.' })
	@ValidateIf((dto: SectionEDto) => dto.hasDisabilityNeeds)
	@IsString()
	@IsNotEmpty()
	@MaxLength(1000)
	disabilityDetails?: string;

	@ApiProperty({ example: 'Jane Akiru Ekiru' })
	@IsString()
	@IsNotEmpty()
	@MaxLength(255)
	declarationName!: string;

	@ApiProperty({ example: true })
	@IsBoolean()
	@Equals(true)
	confirmTruth!: boolean;

	@ApiProperty({ example: true })
	@IsBoolean()
	@Equals(true)
	authorizeVerification!: boolean;

	@ApiProperty({ example: true })
	@IsBoolean()
	@Equals(true)
	acceptPrivacyPolicy!: boolean;
}
