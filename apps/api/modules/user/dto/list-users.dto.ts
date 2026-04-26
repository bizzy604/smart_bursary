/**
 * Purpose: Validate query filters for the user directory listing.
 * Why important: Constrains directory queries to supported filters.
 * Used by: UserController list endpoint.
 */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBooleanString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class ListUsersDto {
	@ApiPropertyOptional({ enum: UserRole })
	@IsOptional()
	@IsEnum(UserRole)
	role?: UserRole;

	@ApiPropertyOptional({ description: 'Filter by ward id.' })
	@IsOptional()
	@IsString()
	@MaxLength(64)
	wardId?: string;

	@ApiPropertyOptional({ description: 'true / false; if omitted, returns active users only.' })
	@IsOptional()
	@IsBooleanString()
	isActive?: string;

	@ApiPropertyOptional({ description: 'Free-text search across email and phone.' })
	@IsOptional()
	@IsString()
	@MaxLength(120)
	@Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
	q?: string;
}
