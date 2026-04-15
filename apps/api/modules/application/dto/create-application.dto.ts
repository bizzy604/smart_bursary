/**
 * Purpose: Transport contract for creating a new application draft.
 * Why important: Enforces minimal data required to open an application form.
 * Used by: ApplicationController create endpoint.
 */
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateApplicationDto {
	@IsUUID()
	@IsNotEmpty()
	programId!: string;
}
