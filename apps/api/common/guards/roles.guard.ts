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

		const request = context.switchToHttp().getRequest<{ user?: { role?: UserRole }; headers?: Record<string, string | undefined> }>();
		const userRole = request.user?.role ?? this.resolveRoleFromToken(request.headers?.authorization);

		return !!userRole && requiredRoles.includes(userRole);
	}

	private resolveRoleFromToken(authorizationHeader?: string): UserRole | undefined {
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
			const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as { role?: UserRole };
			return payload.role;
		} catch {
			return undefined;
		}
	}
}
