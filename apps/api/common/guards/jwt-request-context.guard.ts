/**
 * Purpose: Preload trusted JWT claims into the request before global authorization guards run.
 * Why important: RolesGuard and PlanTierGuard are registered globally and depend on request.user.
 * Used by: AppModule guard chain for authenticated HTTP requests.
 */
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

type JwtPayload = {
	sub: string;
	email: string;
	role: UserRole;
	countyId?: string;
	wardId?: string | null;
};

type RequestUser = {
	userId: string;
	email: string;
	role: UserRole;
	countyId: string;
	wardId: string | null;
};

type HttpRequest = {
	headers?: {
		authorization?: string | string[];
	};
	user?: RequestUser;
};

@Injectable()
export class JwtRequestContextGuard implements CanActivate {
	constructor(private readonly jwtService: JwtService) {}

	canActivate(context: ExecutionContext): boolean {
		const request = context.switchToHttp().getRequest<HttpRequest>();
		if (request.user) {
			return true;
		}

		const rawAuthorization = request.headers?.authorization;
		if (!rawAuthorization || Array.isArray(rawAuthorization)) {
			return true;
		}

		const [scheme, token] = rawAuthorization.split(' ');
		if (scheme !== 'Bearer' || !token) {
			return true;
		}

		try {
			const payload = this.jwtService.verify<JwtPayload>(token);
			request.user = {
				userId: payload.sub,
				email: payload.email,
				role: payload.role,
				countyId: payload.countyId ?? '',
				wardId: payload.wardId ?? null,
			};
		} catch {
			// Ignore invalid or expired tokens here and let JwtAuthGuard return the
			// canonical 401 on protected routes.
		}

		return true;
	}
}
