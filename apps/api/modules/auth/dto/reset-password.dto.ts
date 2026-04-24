/**
 * Purpose: Define transport contract for completing a password reset with OTP.
 * Why important: Validates account recovery input before business logic execution.
 * Used by: AuthController reset-password endpoint.
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsStrongPassword } from 'class-validator';

export class ResetPasswordDto {
	@ApiProperty({ example: '847291' })
	@IsString()
	@IsNotEmpty()
	otp!: string;

	@ApiProperty({ example: 'NewSecurePass456!' })
	@IsString()
	@IsStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 })
	password!: string;
}
