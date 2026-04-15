/**
 * Purpose: Attach normalized tenant context to authenticated requests.
 * Why important: Provides a consistent county/user/role shape for downstream handlers.
 * Used by: Global interceptor chain in AppModule.
 */
import {
	CallHandler,
	ExecutionContext,
	Injectable,
	NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

type TenantContext = {
	countyId: string;
	userId: string;
	role: string;
	wardId: string | null;
};

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const request = context.switchToHttp().getRequest<{
			user?: {
				countyId?: string;
				userId?: string;
				role?: string;
				wardId?: string | null;
			};
			tenantContext?: TenantContext;
		}>();

		if (request.user?.countyId && request.user.userId && request.user.role) {
			request.tenantContext = {
				countyId: request.user.countyId,
				userId: request.user.userId,
				role: request.user.role,
				wardId: request.user.wardId ?? null,
			};
		}

		return next.handle();
	}
}
