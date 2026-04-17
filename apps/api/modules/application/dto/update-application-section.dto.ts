/**
 * Purpose: Transport contract for updating an application section.
 * Why important: Validates partial application updates during multi-step form flow.
 * Used by: ApplicationController update-section endpoint.
 */
import { IsJSON, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { IsIn } from 'class-validator';

export const SECTION_KEYS = [
	'section-a',
	'section-b',
	'section-c',
	'section-d',
	'section-e',
	'section-f',
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

export class UpdateApplicationSectionDto {
	@ApiProperty({
		description: 'Section key in the application form schema',
		example: 'section-a',
	})
	@IsString()
	@IsNotEmpty()
	@IsIn(SECTION_KEYS)
	sectionKey!: SectionKey;

	@ApiProperty({
		description: 'Serialized JSON payload for the section content',
		example: '{"fullName":"Jane Doe"}',
	})
	@IsJSON()
	@IsNotEmpty()
	data!: string;
}
