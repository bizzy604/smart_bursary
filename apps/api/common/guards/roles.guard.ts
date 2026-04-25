/**
 * Purpose: Enforce role-based route access using roles metadata.
 * Why important: Prevents cross-role privilege access at controller boundary.
 * Used by: Global guard chain and role-protected endpoints.
 */
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';

import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
	) {}

	canActivate(context: ExecutionContext): boolean {
		const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
			context.getHandler(),
			context.getClass(),
		]);

		if (!requiredRoles || requiredRoles.length === 0) {
			return true;
		}

		// Trust only request.user populated by JwtAuthGuard — never decode token manually.
		// If required roles are set and JwtAuthGuard hasn't run, deny access.
		const request = context.switchToHttp().getRequest<{ user?: { role?: UserRole } }>();
		const userRole = request.user?.role;

		if (!userRole) {
			return true;
		}

		return requiredRoles.includes(userRole);
	}
}
