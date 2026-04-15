/**
 * Purpose: Expose authentication API endpoints.
 * Why important: Provides entry points for registration, token rotation, verification, and profile checks.
 * Used by: Student/admin clients, Swagger docs, and integration tests.
 */
import { BadRequestException, Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Request, Response } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { VerifyPhoneOtpDto } from './dto/verify-phone-otp.dto';
import { PasswordResetService } from './password-reset.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly passwordResetService: PasswordResetService,
	) {}

	@Post('register')
	@ApiOperation({ summary: 'Register a new student account' })
	@ApiBody({ type: RegisterDto })
	@ApiOkResponse({ description: 'Account created and access token issued.' })
	async register(
		@Body() dto: RegisterDto,
		@Res({ passthrough: true }) response: Response,
	): Promise<{ accessToken: string }> {
		const result = await this.authService.register(dto);
		this.setRefreshCookie(response, result.refreshToken);
		return { accessToken: result.accessToken };
	}

	@Post('login')
	@ApiOperation({ summary: 'Authenticate and issue access token' })
	@ApiBody({ type: LoginDto })
	@ApiOkResponse({ description: 'Access token issued and refresh cookie rotated.' })
	async login(
		@Body() dto: LoginDto,
		@Res({ passthrough: true }) response: Response,
	): Promise<{ accessToken: string }> {
		const result = await this.authService.login(dto);
		this.setRefreshCookie(response, result.refreshToken);
		return { accessToken: result.accessToken };
	}

	@Post('verify-email')
	@ApiOperation({ summary: 'Verify a registration email token' })
	@ApiBody({ type: VerifyEmailDto })
	@ApiOkResponse({ description: 'Email verified.' })
	verifyEmail(@Body() dto: VerifyEmailDto): Promise<{ verified: true }> {
		return this.authService.verifyEmail(dto.token);
	}

	@UseGuards(JwtAuthGuard)
	@Post('send-phone-otp')
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Send a phone OTP to the authenticated user' })
	@ApiOkResponse({ description: 'OTP issued in non-production environments.' })
	sendPhoneOtp(@CurrentUser() user: Record<string, unknown>): Promise<{ otp: string }> {
		return this.authService.issuePhoneOtp(user['userId'] as string);
	}

	@UseGuards(JwtAuthGuard)
	@Post('verify-phone-otp')
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Verify the phone OTP for the authenticated user' })
	@ApiBody({ type: VerifyPhoneOtpDto })
	@ApiOkResponse({ description: 'Phone number verified.' })
	verifyPhoneOtp(
		@CurrentUser() user: Record<string, unknown>,
		@Body() dto: VerifyPhoneOtpDto,
	): Promise<{ verified: true }> {
		return this.authService.verifyPhoneOtp(user['userId'] as string, dto.otp);
	}

	@Post('refresh')
	@ApiCookieAuth('__refresh_token')
	@ApiOperation({ summary: 'Refresh the access token using the refresh cookie' })
	@ApiOkResponse({ description: 'New access token issued.' })
	async refresh(
		@Req() request: Request,
		@Res({ passthrough: true }) response: Response,
	): Promise<{ accessToken: string }> {
		const refreshToken = request.cookies?.__refresh_token as string | undefined;
		if (!refreshToken) {
			throw new BadRequestException('Missing refresh token cookie.');
		}

		const result = await this.authService.refreshSession(refreshToken);
		this.setRefreshCookie(response, result.refreshToken);
		return { accessToken: result.accessToken };
	}

	@Post('logout')
	@ApiCookieAuth('__refresh_token')
	@ApiOperation({ summary: 'Revoke the refresh token and clear the cookie' })
	@HttpCode(204)
	async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<void> {
		const refreshToken = request.cookies?.__refresh_token as string | undefined;
		await this.authService.logout(refreshToken);
		response.clearCookie('__refresh_token', this.refreshCookieOptions());
	}

	@Post('request-password-reset')
	@ApiOperation({ summary: 'Request a password reset OTP' })
	@ApiBody({ type: RequestPasswordResetDto })
	requestPasswordReset(
		@Body() dto: RequestPasswordResetDto,
	): Promise<{ accepted: true; otp?: string }> {
		return this.passwordResetService.requestPasswordReset(dto);
	}

	@Post('reset-password')
	@ApiOperation({ summary: 'Reset a password with OTP' })
	@ApiBody({ type: ResetPasswordDto })
	resetPassword(@Body() dto: ResetPasswordDto): Promise<{ ok: true }> {
		return this.passwordResetService.resetPassword(dto);
	}

	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@Get('me')
	me(@CurrentUser() user: Record<string, unknown>): Record<string, unknown> {
		return user;
	}

	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@Roles(UserRole.COUNTY_ADMIN)
	@Get('admin-probe')
	adminProbe(): { ok: boolean } {
		return { ok: true };
	}

	private setRefreshCookie(response: Response, refreshToken: string): void {
		response.cookie('__refresh_token', refreshToken, this.refreshCookieOptions());
	}

	private refreshCookieOptions() {
		return {
			httpOnly: true,
			sameSite: 'lax' as const,
			secure: false,
			path: '/api/v1/auth',
			maxAge: 7 * 24 * 60 * 60 * 1000,
		};
	}
}
