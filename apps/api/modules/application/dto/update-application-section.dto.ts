/**
 * Purpose: Transport contract for updating an application section.
 * Why important: Validates partial application updates during multi-step form flow.
 * Used by: ApplicationController update-section endpoint.
 */
import { IsJSON, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateApplicationSectionDto {
	@ApiProperty({
		description: 'Section key in the application form schema',
		example: 'section_a',
	})
	@IsString()
	@IsNotEmpty()
	sectionKey!: string;

	@ApiProperty({
		description: 'Serialized JSON payload for the section content',
		example: '{"fullName":"Jane Doe"}',
	})
	@IsJSON()
	@IsNotEmpty()
	data!: string;
}
