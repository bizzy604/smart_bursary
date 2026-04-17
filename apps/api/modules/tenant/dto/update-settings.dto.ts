/**
 * Purpose: Define transport contracts for county-admin tenant settings updates.
 * Why important: Validates branding and form-customization inputs before persistence.
 * Used by: TenantController and TenantService.
 */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
	ArrayMaxSize,
	ArrayMinSize,
	IsArray,
	IsIn,
	IsOptional,
	IsString,
	Matches,
	MaxLength,
	ValidateNested,
} from 'class-validator';

const FORM_SECTION_KEYS = [
	'section-a',
	'section-b',
	'section-c',
	'section-d',
	'section-e',
	'section-f',
] as const;

const LOGO_PLACEMENTS = ['HEADER_LEFT', 'HEADER_CENTER', 'HEADER_RIGHT'] as const;
const COLOR_SCHEMES = ['COUNTY_PRIMARY', 'NEUTRAL'] as const;

export class BrandingSettingsDto {
	@ApiPropertyOptional({ example: 'Turkana County' })
	@IsOptional()
	@IsString()
	@MaxLength(120)
	countyName?: string;

	@ApiPropertyOptional({ example: 'Turkana County Education Fund' })
	@IsOptional()
	@IsString()
	@MaxLength(180)
	fundName?: string;

	@ApiPropertyOptional({ example: 'No. 4 of 2023' })
	@IsOptional()
	@IsString()
	@MaxLength(180)
	legalReference?: string;

	@ApiPropertyOptional({ example: '#1E3A5F' })
	@IsOptional()
	@Matches(/^#[0-9A-Fa-f]{6}$/)
	primaryColor?: string;

	@ApiPropertyOptional({ example: 'TC' })
	@IsOptional()
	@IsString()
	@MaxLength(8)
	logoText?: string;

	@ApiPropertyOptional({ example: 'county-assets/turkana/logo.png' })
	@IsOptional()
	@IsString()
	@MaxLength(500)
	logoS3Key?: string;
}

export class FormCustomizationSettingsDto {
	@ApiPropertyOptional({ enum: COLOR_SCHEMES, example: 'COUNTY_PRIMARY' })
	@IsOptional()
	@IsIn(COLOR_SCHEMES)
	colorScheme?: (typeof COLOR_SCHEMES)[number];

	@ApiPropertyOptional({ enum: LOGO_PLACEMENTS, example: 'HEADER_CENTER' })
	@IsOptional()
	@IsIn(LOGO_PLACEMENTS)
	logoPlacement?: (typeof LOGO_PLACEMENTS)[number];

	@ApiPropertyOptional({
		type: [String],
		example: ['section-a', 'section-b', 'section-c', 'section-d', 'section-e', 'section-f'],
	})
	@IsOptional()
	@IsArray()
	@ArrayMinSize(6)
	@ArrayMaxSize(6)
	@IsIn(FORM_SECTION_KEYS, { each: true })
	sectionOrder?: string[];
}

export class UpdateSettingsDto {
	@ApiPropertyOptional({ type: BrandingSettingsDto })
	@IsOptional()
	@ValidateNested()
	@Type(() => BrandingSettingsDto)
	branding?: BrandingSettingsDto;

	@ApiPropertyOptional({ type: FormCustomizationSettingsDto })
	@IsOptional()
	@ValidateNested()
	@Type(() => FormCustomizationSettingsDto)
	formCustomization?: FormCustomizationSettingsDto;
}
