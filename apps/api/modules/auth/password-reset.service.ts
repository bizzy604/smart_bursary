/**
 * Purpose: Handle OTP issuance and password reset completion workflows.
 * Why important: Provides end-to-end account recovery without exposing persistence logic to controllers.
 * Used by: AuthController password reset endpoints.
 */
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hash } from 'bcryptjs';
import { randomInt } from 'crypto';

import { PrismaService } from '../../database/prisma.service';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class PasswordResetService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly configService: ConfigService,
	) {}

	async requestPasswordReset(
		dto: RequestPasswordResetDto,
	): Promise<{ accepted: true; otp?: string }> {
		const user = await this.prisma.user.findFirst({
			where: {
				email: dto.email.toLowerCase(),
				county: { slug: dto.countySlug },
				deletedAt: null,
				isActive: true,
			},
			select: { id: true },
		});

		if (!user) {
			return { accepted: true };
		}

		const otp = randomInt(100000, 1000000).toString();
		const resetExpiry = new Date(Date.now() + 15 * 60 * 1000);

		await this.prisma.user.update({
			where: { id: user.id },
			data: {
				resetToken: otp,
				resetExpiry,
			},
		});

		const nodeEnv = this.configService.get<string>('app.nodeEnv', 'development');
		if (nodeEnv === 'development' || nodeEnv === 'test') {
			return { accepted: true, otp };
		}

		return { accepted: true };
	}

	async resetPassword(dto: ResetPasswordDto): Promise<{ ok: true }> {
		const user = await this.prisma.user.findFirst({
			where: {
				resetToken: dto.otp,
				resetExpiry: { gt: new Date() },
				deletedAt: null,
				isActive: true,
			},
			select: { id: true },
		});

		if (!user) {
			throw new BadRequestException('Invalid or expired OTP.');
		}

		const passwordHash = await hash(dto.password, 10);
		await this.prisma.user.update({
			where: { id: user.id },
			data: {
				passwordHash,
				resetToken: null,
				resetExpiry: null,
			},
		});

		return { ok: true };
	}
}
