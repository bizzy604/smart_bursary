/**
 * Purpose: Define transport contract for student registration.
 * Why important: Enforces the minimum data required to create a tenant-scoped user.
 * Used by: AuthController register endpoint.
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsStrongPassword, MaxLength } from 'class-validator';

export class RegisterDto {
	@ApiProperty({ example: 'aisha.lokiru@example.com' })
	@IsEmail()
	@MaxLength(255, { message: 'Email must not exceed 255 characters' })
	email!: string;

	@ApiProperty({ example: 'SecurePass123!' })
	@IsString()
	@IsStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 })
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
	@MaxLength(20, { message: 'Phone number must not exceed 20 characters' })
	phone!: string;
}
