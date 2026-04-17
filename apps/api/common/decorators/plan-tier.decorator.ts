/**
 * Purpose: Attach county subscription-tier requirements to protected routes.
 * Why important: Enables centralized API feature gating by tenant plan tier.
 * Used by: PlanTierGuard and feature-restricted controller handlers.
 */
import { SetMetadata } from '@nestjs/common';

export const PLAN_TIERS = ['BASIC', 'STANDARD', 'ENTERPRISE'] as const;

export type PlanTier = (typeof PLAN_TIERS)[number];

export const PLAN_TIER_RANK: Record<PlanTier, number> = {
	BASIC: 1,
	STANDARD: 2,
	ENTERPRISE: 3,
};

export const PLAN_TIER_KEY = 'plan_tiers';
export const PlanTiers = (...tiers: PlanTier[]) => SetMetadata(PLAN_TIER_KEY, tiers);
