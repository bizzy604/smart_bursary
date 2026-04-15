/**
 * Purpose: Transport contract for submitting a completed application.
 * Why important: Marks a draft application as officially submitted with immutability.
 * Used by: ApplicationController submit endpoint.
 */
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class SubmitApplicationDto {
	@IsUUID()
	@IsNotEmpty()
	applicationId!: string;
}
