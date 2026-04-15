/**
 * Purpose: Define transport contract for student registration.
 * Why important: Enforces the minimum data required to create a tenant-scoped user.
 * Used by: AuthController register endpoint.
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
	@ApiProperty({ example: 'aisha.lokiru@example.com' })
	@IsEmail()
	email!: string;

	@ApiProperty({ example: 'SecurePass123!' })
	@IsString()
	@MinLength(8)
	password!: string;

	@ApiProperty({ example: 'turkana' })
	@IsString()
	@IsNotEmpty()
	countySlug!: string;

	@ApiProperty({ example: 'Aisha Lokiru' })
	@IsString()
	@IsNotEmpty()
	fullName!: string;

	@ApiProperty({ example: '+254712345678' })
	@IsString()
	phone!: string;
}
