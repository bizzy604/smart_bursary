/**
 * Purpose: Transport contract for updating an application section.
 * Why important: Validates partial application updates during multi-step form flow.
 * Used by: ApplicationController update-section endpoint.
 */
import { IsJSON, IsNotEmpty, IsString } from 'class-validator';

export class UpdateApplicationSectionDto {
	@IsString()
	@IsNotEmpty()
	sectionKey!: string;

	@IsJSON()
	@IsNotEmpty()
	data!: string;
}
