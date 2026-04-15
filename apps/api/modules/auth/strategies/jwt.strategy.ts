/**
 * Purpose: Validate JWT access tokens and expose user claims to request context.
 * Why important: Enables authenticated routes to rely on trusted identity attributes.
 * Used by: JwtAuthGuard and protected controllers.
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';

type JwtPayload = {
	sub: string;
	email: string;
	role: UserRole;
	countyId?: string;
	wardId?: string | null;
	county_id?: string;
	ward_id?: string | null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(configService: ConfigService) {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: configService.getOrThrow<string>('auth.jwtSecret'),
		});
	}

	validate(payload: JwtPayload): {
		userId: string;
		email: string;
		role: UserRole;
		countyId: string;
		wardId: string | null;
	} {
		return {
			userId: payload.sub,
			email: payload.email,
			role: payload.role,
			countyId: payload.countyId ?? payload.county_id ?? '',
			wardId: payload.wardId ?? payload.ward_id ?? null,
		};
	}
}
