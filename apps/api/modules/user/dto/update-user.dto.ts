/**
 * Purpose: Validate payload for updating a user's role / ward / phone.
 * Why important: Restricts mutable fields and enforces role transitions at the API boundary.
 * Used by: UserController patch endpoint.
 */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class UpdateUserDto {
	@ApiPropertyOptional({ enum: UserRole })
	@IsOptional()
	@IsEnum(UserRole)
	role?: UserRole;

	@ApiPropertyOptional()
	@IsOptional()
	@IsUUID()
	wardId?: string;

	@ApiPropertyOptional({ example: '+254712345678' })
	@IsOptional()
	@IsString()
	@MaxLength(20)
	@Matches(/^\+?[0-9 \-]{7,20}$/, { message: 'phone must be a valid telephone number.' })
	phone?: string;
}
