/**
 * Purpose: Read authenticated user payload from request context.
 * Why important: Avoids repetitive request casting in controllers.
 * Used by: Protected controller endpoints.
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
	(_data: unknown, ctx: ExecutionContext): Record<string, unknown> => {
		const request = ctx.switchToHttp().getRequest<{ user?: Record<string, unknown> }>();
		return request.user ?? {};
	},
);
