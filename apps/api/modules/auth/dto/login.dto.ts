/**
 * Purpose: Define transport contract for login requests.
 * Why important: Keeps authentication input predictable and validated.
 * Used by: AuthController login endpoint.
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
	@ApiProperty({ example: 'aisha.lokiru@example.com' })
	@IsEmail()
	email!: string;

	@ApiProperty({ example: 'SecurePass123!' })
	@IsString()
	@IsNotEmpty()
	password!: string;

	@ApiProperty({ example: 'turkana' })
	@IsString()
	@IsNotEmpty()
	countySlug!: string;
}
