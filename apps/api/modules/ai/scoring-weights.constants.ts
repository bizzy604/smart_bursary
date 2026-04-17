/**
 * Purpose: Centralize canonical AI scoring-weight defaults and validation helpers.
 * Why important: Keeps county settings, AI APIs, and scoring flows aligned on one contract.
 * Used by: ScoringWeightsService and TenantService.
 */
import { ScoringWeightsDto } from './dto/scoring-weights.dto';

const REQUIRED_KEYS = [
	'family_status',
	'family_income',
	'education_burden',
	'academic_standing',
	'document_quality',
	'integrity',
] as const;

type WeightKey = (typeof REQUIRED_KEYS)[number];

export const DEFAULT_SCORING_WEIGHTS: ScoringWeightsDto = {
	family_status: 0.25,
	family_income: 0.25,
	education_burden: 0.2,
	academic_standing: 0.1,
	document_quality: 0.1,
	integrity: 0.1,
};

export function resolveScoringWeights(value: unknown): ScoringWeightsDto {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return { ...DEFAULT_SCORING_WEIGHTS };
	}

	const source = value as Record<string, unknown>;
	const resolved: Partial<ScoringWeightsDto> = {};

	for (const key of REQUIRED_KEYS) {
		const candidate = source[key];
		if (typeof candidate !== 'number' || !Number.isFinite(candidate)) {
			return { ...DEFAULT_SCORING_WEIGHTS };
		}
		resolved[key] = candidate;
	}

	return resolved as ScoringWeightsDto;
}

export function scoringWeightsToRecord(weights: ScoringWeightsDto): Record<WeightKey, number> {
	return REQUIRED_KEYS.reduce(
		(acc, key) => ({
			...acc,
			[key]: weights[key],
		}),
		{} as Record<WeightKey, number>,
	);
}