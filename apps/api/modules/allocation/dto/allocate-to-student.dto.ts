/**
 * Purpose: Define transport contract for the final per-student allocation decision (Stage 4 of §7).
 * Why important: This is the FINAL allocation per the user-locked policy. The DTO carries the
 *                amount plus, when the actor is not the village admin, the structured override
 *                justification that the service then validates against the AvailabilityService.
 * Used by: AllocationController.allocateToStudent and StudentAllocationService.allocate.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

import { OverrideReasonCode } from './allocation-actor.types';

export class AllocateToStudentDto {
	@ApiProperty({
		description:
			'Final KES amount allocated to the student. Must be > 0 and is constrained by the village pool: village.allocated_total_kes + amount ≤ village.allocated_kes (Invariant 3, enforced under advisory lock).',
		example: 30_000,
	})
	@IsNumber({ maxDecimalPlaces: 2 })
	@Min(1)
	amountKes!: number;

	@ApiPropertyOptional({
		description:
			'Reviewer note recorded in the immutable audit timeline. Strongly recommended for override paths.',
		maxLength: 1500,
	})
	@IsOptional()
	@IsString()
	@MaxLength(1500)
	note?: string;

	@ApiPropertyOptional({
		description:
			'Required when the actor is not a VILLAGE_ADMIN. The reason code MUST match the system-detected unavailability of the village admin or the request is rejected with 403.',
		enum: OverrideReasonCode,
		example: OverrideReasonCode.VILLAGE_ADMIN_VACANT,
	})
	@IsOptional()
	@IsEnum(OverrideReasonCode)
	overrideReasonCode?: OverrideReasonCode;

	@ApiPropertyOptional({
		description:
			'Free-text justification accompanying an override. Strongly recommended; surfaced in OCOB audit reports.',
		maxLength: 1500,
	})
	@IsOptional()
	@IsString()
	@MaxLength(1500)
	overrideReasonNote?: string;
}
