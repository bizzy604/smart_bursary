/**
 * Purpose: Define transport contract for requesting a password reset OTP.
 * Why important: Enforces tenant-scoped identity input for secure account recovery.
 * Used by: AuthController request-password-reset endpoint.
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class RequestPasswordResetDto {
	@ApiProperty({ example: 'aisha.lokiru@example.com' })
	@IsEmail()
	email!: string;

	@ApiProperty({ example: 'turkana' })
	@IsString()
	@IsNotEmpty()
	countySlug!: string;
}
