/**
 * Purpose: Define the transport contract for email verification.
 * Why important: Lets the auth module validate verification tokens before updating account state.
 * Used by: AuthController verify-email endpoint.
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {
	@ApiProperty({ example: 'verify_3f6e8b8d0d' })
	@IsString()
	@IsNotEmpty()
	token!: string;
}
