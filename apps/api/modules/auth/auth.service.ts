/**
 * Purpose: Handle authentication workflows and token issuance.
 * Why important: Centralizes identity verification, token rotation, and tenant-scoped access token creation.
 * Used by: AuthController endpoints and auth integration tests.
 */

import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { randomUUID } from 'crypto';

import { PrismaService } from '../../database/prisma.service';
import { AuthSessionService, AuthClaims } from './auth-session.service';
import { AuthResponse, AuthTokenService } from './auth-token.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly authTokenService: AuthTokenService,
		private readonly authSessionService: AuthSessionService,
	) {}

	async register(dto: RegisterDto): Promise<AuthResponse> {
		const county = await this.prisma.county.findUnique({
			where: { slug: dto.countySlug },
			select: { id: true },
		});

		if (!county) {
			throw new BadRequestException('Invalid county slug.');
		}

		const passwordHash = await hash(dto.password, 10);
		const emailVerificationToken = randomUUID();
		const emailVerifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

		const user = await this.prisma.user.create({
			data: {
				countyId: county.id,
				email: dto.email.toLowerCase(),
				phone: dto.phone,
				passwordHash,
				role: UserRole.STUDENT,
				emailVerifyToken: emailVerificationToken,
				emailVerifyExpiry,
			},
			select: {
				id: true,
				email: true,
				role: true,
				countyId: true,
				wardId: true,
			},
		});

		await this.prisma.studentProfile.create({
			data: {
				userId: user.id,
				countyId: user.countyId,
				fullName: dto.fullName,
				phone: dto.phone,
			},
		});

		return this.buildAuthResponse(user, emailVerificationToken);
	}

	async login(dto: LoginDto): Promise<AuthResponse> {
		const user = await this.prisma.user.findFirst({
			where: {
				email: dto.email.toLowerCase(),
				county: { slug: dto.countySlug },
				deletedAt: null,
				isActive: true,
			},
			select: {
				id: true,
				email: true,
				passwordHash: true,
				role: true,
				countyId: true,
				wardId: true,
			},
		});

		if (!user) {
			throw new UnauthorizedException('Invalid credentials.');
		}

		const isPasswordValid = await compare(dto.password, user.passwordHash);
		if (!isPasswordValid) {
			throw new UnauthorizedException('Invalid credentials.');
		}

		await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

		return this.buildAuthResponse(user);
	}

	async verifyEmail(token: string): Promise<{ verified: true }> {
		const user = await this.prisma.user.findFirst({
			where: {
				emailVerifyToken: token,
				emailVerifyExpiry: { gt: new Date() },
				deletedAt: null,
				isActive: true,
			},
			select: { id: true },
		});

		if (!user) {
			throw new BadRequestException('Invalid or expired verification token.');
		}

		await this.prisma.user.update({
			where: { id: user.id },
			data: { emailVerified: true, emailVerifyToken: null, emailVerifyExpiry: null },
		});

		return { verified: true };
	}

	async issuePhoneOtp(userId: string): Promise<{ otp: string }> {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { id: true, emailVerified: true },
		});

		if (!user) {
			throw new BadRequestException('User not found.');
		}

		if (!user.emailVerified) {
			throw new BadRequestException('Email must be verified first.');
		}

		const ttlSeconds = this.authTokenService.refreshTtlSeconds('5m');
		const otp = await this.authSessionService.createPhoneOtp(user.id, ttlSeconds);
		return { otp };
	}

	async verifyPhoneOtp(userId: string, otp: string): Promise<{ verified: true }> {
		const isValid = await this.authSessionService.consumePhoneOtp(userId, otp);
		if (!isValid) {
			throw new BadRequestException('Invalid or expired OTP.');
		}

		await this.prisma.user.update({ where: { id: userId }, data: { phoneVerified: true } });
		return { verified: true };
	}

	async refreshSession(refreshToken: string): Promise<AuthResponse> {
		// consumeRefreshToken uses GETDEL — atomically reads and removes the token.
		const claims = await this.authSessionService.consumeRefreshToken(refreshToken);
		if (!claims) {
			throw new UnauthorizedException('Invalid refresh token.');
		}

		const newRefreshToken = await this.authSessionService.createRefreshToken(
			claims,
			this.authTokenService.refreshTtlSeconds(),
		);

		return this.authTokenService.createAuthResponse(
			{
				id: claims.userId,
				email: claims.email,
				role: claims.role,
				countyId: claims.countyId,
				wardId: claims.wardId,
			},
			newRefreshToken,
		);
	}

	async logout(refreshToken?: string): Promise<{ ok: true }> {
		if (refreshToken) {
			await this.authSessionService.revokeRefreshToken(refreshToken);
		}

		return { ok: true };
	}

	async issueRefreshTokenForUser(user: {
		id: string;
		email: string;
		role: UserRole;
		countyId: string;
		wardId: string | null;
	}): Promise<{ refreshToken: string }> {
		const claims: AuthClaims = {
			userId: user.id,
			email: user.email,
			role: user.role,
			countyId: user.countyId,
			wardId: user.wardId,
		};

		const refreshToken = await this.authSessionService.createRefreshToken(
			claims,
			this.authTokenService.refreshTtlSeconds(),
		);

		return { refreshToken };
	}

	private buildAuthResponse(
		user: { id: string; email: string; role: UserRole; countyId: string; wardId: string | null },
		emailVerificationToken?: string,
	): Promise<AuthResponse> {
		return this.issueRefreshTokenForUser(user).then(({ refreshToken }) =>
			this.authTokenService.createAuthResponse(user, refreshToken, emailVerificationToken),
		);
	}
}
