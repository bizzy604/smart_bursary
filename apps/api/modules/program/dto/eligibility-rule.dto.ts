/**
 * Purpose: Define transport shape for program eligibility rules.
 * Why important: Ensures rule payloads are validated before persistence.
 * Used by: Program create and update DTOs.
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsString, MaxLength } from 'class-validator';

export class EligibilityRuleDto {
	@ApiProperty({
		description: 'Rule discriminator key.',
		example: 'EDUCATION_LEVEL',
	})
	@IsString()
	@MaxLength(50)
	ruleType!: string;

	@ApiProperty({
		description: 'Rule parameters payload.',
		example: { allowed: ['SECONDARY', 'COLLEGE_TVET', 'UNIVERSITY'] },
		additionalProperties: true,
	})
	@IsObject()
	parameters!: Record<string, unknown>;
}
