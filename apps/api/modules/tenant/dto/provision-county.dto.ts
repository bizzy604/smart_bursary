/**
 * Purpose: Validate payloads for platform-operator county provisioning.
 * Why important: Prevents invalid tenant bootstrap inputs from reaching persistence flows.
 * Used by: TenantProvisioningController and ProvisioningService.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
	ArrayMaxSize,
	ArrayMinSize,
	IsArray,
	IsEmail,
	IsIn,
	IsOptional,
	IsString,
	Matches,
	MaxLength,
	MinLength,
	ValidateNested,
} from 'class-validator';

import { PLAN_TIERS } from '../../../common/decorators/plan-tier.decorator';

export class ProvisionWardDto {
	@ApiProperty({ example: 'NWR-0001' })
	@IsString()
	@MaxLength(20)
	code!: string;

	@ApiProperty({ example: 'National Ward 1' })
	@IsString()
	@MaxLength(120)
	name!: string;

	@ApiPropertyOptional({ example: 'Lodwar' })
	@IsOptional()
	@IsString()
	@MaxLength(120)
	subCounty?: string;
}

export class ProvisionSuperAdminDto {
	@ApiProperty({ example: 'admin@elgeyo.example.com' })
	@IsEmail()
	@MaxLength(255)
	email!: string;

	@ApiProperty({ example: 'StrongPass!2026' })
	@IsString()
	@MinLength(10)
	@MaxLength(72)
	password!: string;

	@ApiPropertyOptional({ example: '+254700123456' })
	@IsOptional()
	@IsString()
	@MaxLength(20)
	phone?: string;
}

export class ProvisionCountyDto {
	@ApiProperty({ example: 'elgeyo-marakwet' })
	@IsString()
	@MaxLength(60)
	@Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
	slug!: string;

	@ApiProperty({ example: 'Elgeyo Marakwet County' })
	@IsString()
	@MaxLength(120)
	name!: string;

	@ApiPropertyOptional({ example: 'Elgeyo Marakwet County Education Fund' })
	@IsOptional()
	@IsString()
	@MaxLength(180)
	fundName?: string;

	@ApiPropertyOptional({ example: 'No. 7 of 2025' })
	@IsOptional()
	@IsString()
	@MaxLength(180)
	legalReference?: string;

	@ApiPropertyOptional({ example: '#1E3A5F' })
	@IsOptional()
	@Matches(/^#[0-9A-Fa-f]{6}$/)
	primaryColor?: string;

	@ApiPropertyOptional({ enum: PLAN_TIERS, example: 'STANDARD' })
	@IsOptional()
	@IsIn(PLAN_TIERS)
	planTier?: (typeof PLAN_TIERS)[number];

	@ApiPropertyOptional({
		type: [ProvisionWardDto],
		description: 'Optional explicit ward seed list. Defaults to national registry snapshot.',
	})
	@IsOptional()
	@IsArray()
	@ArrayMinSize(1)
	@ArrayMaxSize(2000)
	@ValidateNested({ each: true })
	@Type(() => ProvisionWardDto)
	wards?: ProvisionWardDto[];

	@ApiProperty({ type: ProvisionSuperAdminDto })
	@ValidateNested()
	@Type(() => ProvisionSuperAdminDto)
	superAdmin!: ProvisionSuperAdminDto;
}
