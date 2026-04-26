/**
 * Purpose: Define transport contract for County → Ward budget allocation (Stage 2 of §7).
 * Why important: Validates that the county-level distribution to a ward is syntactically sound
 *               before the service-layer invariant check (Σ(ward_pools) ≤ program.budget_ceiling).
 * Used by: AllocationController.createWardAllocation and WardBudgetAllocationService.create.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateWardAllocationDto {
	@ApiProperty({
		description: 'Ward identifier (UUID) within the same county as the program.',
		example: '6f8c2d9c-1234-4abc-9def-0123456789ab',
	})
	@IsUUID()
	wardId!: string;

	@ApiProperty({
		description:
			'Amount in KES allocated to this ward from the program budget. Must be > 0; the sum across all wards for the program is enforced ≤ program.budgetCeiling at write time.',
		example: 5_000_000,
	})
	@IsNumber({ maxDecimalPlaces: 2 })
	@Min(1)
	allocatedKes!: number;

	@ApiPropertyOptional({
		description: 'Optional note recorded in the immutable audit timeline.',
		example: 'Initial allocation per Q1 2026 county finance committee resolution.',
		maxLength: 500,
	})
	@IsOptional()
	@IsString()
	@MaxLength(500)
	note?: string;
}
