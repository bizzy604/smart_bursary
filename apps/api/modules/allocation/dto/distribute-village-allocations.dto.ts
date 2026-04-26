/**
 * Purpose: Define transport contract for the Ward → Village distribution decision (Stage 3 of §7).
 * Why important: The ward committee receives a per-village pool; the service-layer validator enforces
 *                Σ(village_pool) == ward_pool (Invariant 2) atomically under a 3-level advisory lock.
 * Used by: AllocationController.distributeWardToVillages and VillageBudgetAllocationService.distribute.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DistributionMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min, ValidateNested } from 'class-validator';

export class VillagePoolEntryDto {
	@ApiProperty({
		description: 'Village unit identifier (UUID); must belong to the ward being distributed.',
		example: '7a1c8b1c-1234-4abc-9def-0123456789ab',
	})
	@IsUUID()
	villageUnitId!: string;

	@ApiProperty({
		description: 'KES amount allocated to this village from the ward pool. Σ across the ward must equal ward.allocated_kes.',
		example: 1_200_000,
	})
	@IsNumber({ maxDecimalPlaces: 2 })
	@Min(0)
	allocatedKes!: number;

	@ApiPropertyOptional({
		description: 'Snapshot of the applicant count in this village at distribution time (used for audit; defaults to system-computed value if omitted).',
		example: 80,
	})
	@IsOptional()
	@IsNumber()
	@Min(0)
	applicantCountAtDistribution?: number;
}

export class DistributeVillageAllocationsDto {
	@ApiProperty({
		description: 'Ordered list of per-village pool amounts. Must cover every applicable village in the ward (system enforces Σ == ward_pool).',
		type: [VillagePoolEntryDto],
	})
	@IsArray()
	@ArrayMinSize(1)
	@ValidateNested({ each: true })
	@Type(() => VillagePoolEntryDto)
	villageAllocations!: VillagePoolEntryDto[];

	@ApiProperty({
		description: 'Distribution method recorded for audit. PROPORTIONAL is the system-computed default; MANUAL_OVERRIDE indicates the committee adjusted amounts; AI_WEIGHTED is reserved for future use.',
		enum: DistributionMethod,
		example: DistributionMethod.PROPORTIONAL,
	})
	@IsEnum(DistributionMethod)
	distributionMethod!: DistributionMethod;

	@ApiPropertyOptional({
		description: 'Optional ISO-8601 timestamp by which the village admin must complete student-level allocation. Used by the override-hierarchy availability detector (§7.4).',
		example: '2026-05-15T16:00:00.000Z',
	})
	@IsOptional()
	@IsString()
	villageAllocationDueAt?: string;

	@ApiPropertyOptional({
		description: 'Ward committee note recorded in the timeline.',
		maxLength: 1500,
	})
	@IsOptional()
	@IsString()
	@MaxLength(1500)
	note?: string;
}
