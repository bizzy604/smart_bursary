/**
 * Purpose: Extract county identifier from authenticated request context.
 * Why important: Supports tenant-scoped handlers without manual request parsing.
 * Used by: Controllers and services requiring county-aware operations.
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const County = createParamDecorator(
	(_data: unknown, ctx: ExecutionContext): string | null => {
		const request = ctx.switchToHttp().getRequest<{ user?: { countyId?: string } }>();
		return request.user?.countyId ?? null;
	},
);
