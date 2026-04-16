/**
 * Purpose: Transport contract for creating a new application draft.
 * Why important: Enforces minimal data required to open an application form.
 * Used by: ApplicationController create endpoint.
 */
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateApplicationDto {
	@ApiProperty({
		description: 'Program identifier to start a draft against',
		example: 'a6f57538-cb38-4fc0-b5f8-d225c7600e8e',
	})
	@IsUUID()
	@IsNotEmpty()
	programId!: string;
}
