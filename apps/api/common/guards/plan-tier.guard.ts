/**
 * Purpose: Enforce county subscription-tier feature access at API boundaries.
 * Why important: Prevents lower-tier counties from accessing restricted capabilities.
 * Used by: Global guard chain for routes annotated with plan-tier metadata.
 */
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
	PLAN_TIER_KEY,
	PLAN_TIER_RANK,
	PLAN_TIERS,
	PlanTier,
} from '../decorators/plan-tier.decorator';

type RequestUser = {
	role?: UserRole;
	countyId?: string;
};

type JwtPlanPayload = {
	role?: UserRole;
	countyId?: string;
	county_id?: string;
};

@Injectable()
export class PlanTierGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly prisma: PrismaService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const requiredTiers = this.reflector.getAllAndOverride<PlanTier[]>(PLAN_TIER_KEY, [
			context.getHandler(),
			context.getClass(),
		]);

		if (!requiredTiers || requiredTiers.length === 0) {
			return true;
		}

		const request = context
			.switchToHttp()
			.getRequest<{ user?: RequestUser; headers?: Record<string, string | undefined> }>();
		const authorizationHeader = request.headers?.authorization;
		const tokenPayload = this.decodePayload(authorizationHeader);
		if (!request.user && !tokenPayload) {
			return true;
		}

		const role = request.user?.role ?? tokenPayload?.role;
		if (role === UserRole.PLATFORM_OPERATOR) {
			return true;
		}

		const countyId = request.user?.countyId ?? tokenPayload?.countyId ?? tokenPayload?.county_id;
		if (!countyId) {
			throw new ForbiddenException('County context is required for this feature.');
		}

		const county = await this.prisma.county.findUnique({
			where: { id: countyId },
			select: { isActive: true, planTier: true },
		});
		if (!county || !county.isActive) {
			throw new ForbiddenException('County is not active for this feature.');
		}

		const countyPlanTier = this.normalizeTier(county.planTier);
		const allowed = requiredTiers.some(
			(requiredTier) => PLAN_TIER_RANK[countyPlanTier] >= PLAN_TIER_RANK[requiredTier],
		);
		if (!allowed) {
			throw new ForbiddenException(
				'Current county subscription plan does not allow this feature.',
			);
		}

		return true;
	}

	private normalizeTier(rawTier: string): PlanTier {
		const normalized = rawTier.toUpperCase();
		if (PLAN_TIERS.includes(normalized as PlanTier)) {
			return normalized as PlanTier;
		}

		return 'BASIC';
	}

	private decodePayload(authorizationHeader?: string): JwtPlanPayload | undefined {
		if (!authorizationHeader?.startsWith('Bearer ')) {
			return undefined;
		}

		const token = authorizationHeader.slice('Bearer '.length).trim();
		if (!token) {
			return undefined;
		}

		try {
			const payloadPart = token.split('.')[1];
			if (!payloadPart) {
				return undefined;
			}
			const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
			const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
			return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as JwtPlanPayload;
		} catch {
			return undefined;
		}
	}
}
