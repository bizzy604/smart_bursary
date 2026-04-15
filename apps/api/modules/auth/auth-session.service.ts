/**
 * Purpose: Manage auth-side ephemeral state such as refresh tokens and phone OTPs.
 * Why important: Keeps token hashing, Redis storage, and rotation logic out of controllers and core auth rules.
 * Used by: AuthService and AuthController auth-hardening endpoints.
 */

import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { createHash, randomUUID, randomInt } from 'crypto';

import { RedisService } from '../../redis/redis.service';

export type AuthClaims = {
	userId: string;
	email: string;
	role: UserRole;
	countyId: string;
	wardId: string | null;
};

@Injectable()
export class AuthSessionService {
	constructor(private readonly redisService: RedisService) {}

	async createRefreshToken(claims: AuthClaims, ttlSeconds: number): Promise<string> {
		const refreshToken = randomUUID();
		await this.redisService.getClient().set(
			this.refreshKey(refreshToken),
			JSON.stringify(claims),
			'EX',
			ttlSeconds,
		);
		return refreshToken;
	}

	async consumeRefreshToken(refreshToken: string): Promise<AuthClaims | null> {
		const serializedClaims = await this.redisService.getClient().get(this.refreshKey(refreshToken));
		if (!serializedClaims) {
			return null;
		}

		return JSON.parse(serializedClaims) as AuthClaims;
	}

	async revokeRefreshToken(refreshToken: string): Promise<void> {
		await this.redisService.getClient().del(this.refreshKey(refreshToken));
	}

	async createPhoneOtp(userId: string, ttlSeconds: number): Promise<string> {
		const otp = randomInt(100000, 1000000).toString();
		await this.redisService.getClient().set(this.phoneOtpKey(userId), otp, 'EX', ttlSeconds);
		return otp;
	}

	async consumePhoneOtp(userId: string, otp: string): Promise<boolean> {
		const storedOtp = await this.redisService.getClient().get(this.phoneOtpKey(userId));
		if (!storedOtp || storedOtp !== otp) {
			return false;
		}

		await this.redisService.getClient().del(this.phoneOtpKey(userId));
		return true;
	}

	private refreshKey(refreshToken: string): string {
		return `auth:refresh:${createHash('sha256').update(refreshToken).digest('hex')}`;
	}

	private phoneOtpKey(userId: string): string {
		return `auth:phone-otp:${userId}`;
	}
}
