/**
 * Purpose: Validate payload for inviting a new user to the current tenant.
 * Why important: Controls the role and scope of newly created admin / reviewer accounts.
 * Used by: UserController invite endpoint.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { UserRole } from '@prisma/client';

const INVITABLE_ROLES = [
	UserRole.COUNTY_ADMIN,
	UserRole.WARD_ADMIN,
	UserRole.VILLAGE_ADMIN,
	UserRole.FINANCE_OFFICER,
] as const;

export class InviteUserDto {
	@ApiProperty({ example: 'reviewer@turkana.go.ke' })
	@Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
	@IsEmail()
	@MaxLength(255)
	email!: string;

	@ApiProperty({ enum: INVITABLE_ROLES })
	@IsIn(INVITABLE_ROLES as readonly UserRole[])
	role!: UserRole;

	@ApiPropertyOptional({ description: 'Ward identifier (required for ward-scoped roles).' })
	@IsOptional()
	@IsUUID()
	wardId?: string;

	@ApiPropertyOptional({ description: 'Village unit identifier (required for VILLAGE_ADMIN role).' })
	@IsOptional()
	@IsUUID()
	villageUnitId?: string;

	@ApiPropertyOptional({ example: '+254712345678' })
	@IsOptional()
	@IsString()
	@MaxLength(20)
	@Matches(/^\+?[0-9 \-]{7,20}$/, { message: 'phone must be a valid telephone number.' })
	phone?: string;
}
