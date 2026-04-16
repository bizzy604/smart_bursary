/**
 * Purpose: Transport contract for submitting a completed application.
 * Why important: Marks a draft application as officially submitted with immutability.
 * Used by: ApplicationController submit endpoint.
 */
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitApplicationDto {
	@ApiProperty({
		description: 'Draft application identifier to submit',
		example: 'a6f57538-cb38-4fc0-b5f8-d225c7600e8e',
	})
	@IsUUID()
	@IsNotEmpty()
	applicationId!: string;
}
