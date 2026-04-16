/**
 * Purpose: Enforce service-to-service authentication for internal endpoints.
 * Why important: Protects internal write surfaces from external access.
 * Used by: InternalController and any future internal-only endpoints.
 */
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ServiceAuthGuard implements CanActivate {
	constructor(private readonly configService: ConfigService) {}

	canActivate(context: ExecutionContext): boolean {
		const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
		const expectedKey = this.configService.get<string>('internal.serviceKey', '');
		const providedKey = request.headers['x-service-key'];

		if (!expectedKey || providedKey !== expectedKey) {
			throw new UnauthorizedException('Missing or invalid internal service key.');
		}

		return true;
	}
}
