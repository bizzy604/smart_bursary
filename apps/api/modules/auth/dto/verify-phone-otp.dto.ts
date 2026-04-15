/**
 * Purpose: Define the transport contract for phone OTP verification.
 * Why important: Lets the auth module validate one-time codes before marking a phone as verified.
 * Used by: AuthController verify-phone-otp endpoint.
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyPhoneOtpDto {
	@ApiProperty({ example: '847291' })
	@IsString()
	@IsNotEmpty()
	@Length(6, 6)
	otp!: string;
}
