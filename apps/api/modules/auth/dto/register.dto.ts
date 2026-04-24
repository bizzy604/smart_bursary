/**
 * Purpose: Define transport contract for student registration.
 * Why important: Enforces the minimum data required to create a tenant-scoped user.
 * Used by: AuthController register endpoint.
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsStrongPassword } from 'class-validator';

export class RegisterDto {
	@ApiProperty({ example: 'aisha.lokiru@example.com' })
	@IsEmail()
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
	phone!: string;
}
