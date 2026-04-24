import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

import { AuthClaims } from './auth-session.service';

type AccessTokenClaims = {
	sub: string;
	email: string;
	role: UserRole;
	countyId: string;
	wardId: string | null;
};

export type AuthResponse = {
	accessToken: string;
	refreshToken: string;
	user: {
		id: string;
		email: string;
		role: UserRole;
		countyId: string;
		wardId: string | null;
	};
	emailVerificationToken?: string;
};

type AuthUser = {
	id: string;
	email: string;
	role: UserRole;
	countyId: string;
	wardId: string | null;
};

@Injectable()
export class AuthTokenService {
	constructor(
		private readonly jwtService: JwtService,
		private readonly configService: ConfigService,
	) {}

	createAuthResponse(
		user: AuthUser,
		refreshToken: string,
		emailVerificationToken?: string,
	): AuthResponse {
		return {
			accessToken: this.signAccessToken({
				userId: user.id,
				email: user.email,
				role: user.role,
				countyId: user.countyId,
				wardId: user.wardId,
			}),
			refreshToken,
			user: {
				id: user.id,
				email: user.email,
				role: user.role,
				countyId: user.countyId,
				wardId: user.wardId,
			},
			emailVerificationToken:
				this.configService.get<string>('app.nodeEnv', 'development') === 'production'
					? undefined
					: emailVerificationToken,
		};
	}

	refreshTtlSeconds(defaultTtl = this.configService.get<string>('auth.refreshTokenTtl', '7d')): number {
		const ttl = defaultTtl;
		const numeric = Number.parseInt(ttl, 10);
		if (Number.isFinite(numeric)) {
			return numeric;
		}

		const value = Number.parseInt(ttl.slice(0, -1), 10);
		const unit = ttl.slice(-1);
		if (!Number.isFinite(value)) {
			return 7 * 24 * 60 * 60;
		}

		if (unit === 'm') return value * 60;
		if (unit === 'h') return value * 60 * 60;
		if (unit === 'd') return value * 24 * 60 * 60;
		return 7 * 24 * 60 * 60;
	}

	private signAccessToken(user: AuthClaims): string {
		const payload: AccessTokenClaims = {
			sub: user.userId,
			email: user.email,
			role: user.role,
			countyId: user.countyId,
			wardId: user.wardId,
		};

		return this.jwtService.sign(payload);
	}
}