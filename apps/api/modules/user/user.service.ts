/**
 * Purpose: Manage tenant users (directory listing, invitation, role/ward edits, deactivate, delete).
 * Why important: Provides the authoritative CRUD surface county admins use to manage their team.
 * Used by: UserController for /users/* endpoints.
 */
import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';
import { randomBytes } from 'node:crypto';

import { PrismaService } from '../../database/prisma.service';
import type { ListUsersDto } from './dto/list-users.dto';
import type { InviteUserDto } from './dto/invite-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';

const WARD_SCOPED_ROLES: ReadonlySet<UserRole> = new Set([
	UserRole.WARD_ADMIN,
	UserRole.VILLAGE_ADMIN,
	UserRole.FIELD_AGENT,
]);

const STAFF_ROLES: ReadonlySet<UserRole> = new Set([
	UserRole.COUNTY_ADMIN,
	UserRole.WARD_ADMIN,
	UserRole.VILLAGE_ADMIN,
	UserRole.FINANCE_OFFICER,
	UserRole.FIELD_AGENT,
]);

type UserRowSelect = Prisma.UserGetPayload<{
	select: {
		id: true;
		email: true;
		phone: true;
		role: true;
		isActive: true;
		emailVerified: true;
		phoneVerified: true;
		wardId: true;
		ward: { select: { id: true; name: true; code: true } };
		lastLoginAt: true;
		createdAt: true;
		updatedAt: true;
		deletedAt: true;
	};
}>;

const userRowSelect = {
	id: true,
	email: true,
	phone: true,
	role: true,
	isActive: true,
	emailVerified: true,
	phoneVerified: true,
	wardId: true,
	ward: { select: { id: true, name: true, code: true } },
	lastLoginAt: true,
	createdAt: true,
	updatedAt: true,
	deletedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UserService {
	constructor(private readonly prisma: PrismaService) {}

	async listTenantWards(countyId: string | null) {
		if (!countyId) {
			throw new ForbiddenException('Tenant context is required.');
		}
		const wards = await this.prisma.ward.findMany({
			where: { countyId },
			orderBy: { name: 'asc' },
			select: { id: true, name: true, code: true },
		});
		return { data: wards };
	}

	async listUsers(countyId: string | null, query: ListUsersDto) {
		if (!countyId) {
			throw new ForbiddenException('Tenant context is required to list users.');
		}

		const includeInactive = query.isActive !== undefined;
		const isActiveFilter =
			query.isActive === undefined ? undefined : query.isActive === 'true';

		const where: Prisma.UserWhereInput = {
			countyId,
			deletedAt: null,
			role: query.role ?? { in: Array.from(STAFF_ROLES) },
			...(query.wardId ? { wardId: query.wardId } : {}),
			...(includeInactive && isActiveFilter !== undefined ? { isActive: isActiveFilter } : {}),
			...(query.q
				? {
						OR: [
							{ email: { contains: query.q, mode: 'insensitive' } },
							{ phone: { contains: query.q, mode: 'insensitive' } },
						],
					}
				: {}),
		};

		const users = await this.prisma.user.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			select: userRowSelect,
		});

		return { data: users.map(this.toResponse) };
	}

	async getUser(countyId: string | null, userId: string) {
		const user = await this.prisma.user.findFirst({
			where: { id: userId, ...(countyId ? { countyId } : {}), deletedAt: null },
			select: userRowSelect,
		});

		if (!user) {
			throw new NotFoundException('User not found.');
		}

		return { data: this.toResponse(user) };
	}

	async inviteUser(countyId: string | null, dto: InviteUserDto) {
		if (!countyId) {
			throw new ForbiddenException('Tenant context is required to invite users.');
		}

		if (dto.role === UserRole.PLATFORM_OPERATOR || dto.role === UserRole.STUDENT) {
			throw new BadRequestException('That role cannot be invited from the user directory.');
		}

		this.assertWardScopeMatchesRole(dto.role, dto.wardId);

		const existing = await this.prisma.user.findFirst({
			where: { email: dto.email, countyId },
			select: { id: true, deletedAt: true },
		});

		if (existing) {
			if (existing.deletedAt) {
				throw new ConflictException(
					'A user with that email was previously deleted in this tenant. Contact a platform operator to permanently remove or restore the record before re-inviting.',
				);
			}
			throw new ConflictException('A user with that email already exists in this tenant.');
		}

		if (dto.wardId) {
			const ward = await this.prisma.ward.findFirst({
				where: { id: dto.wardId, countyId },
				select: { id: true },
			});
			if (!ward) {
				throw new BadRequestException('Ward does not belong to the current tenant.');
			}
		}

		const tempPassword = randomBytes(18).toString('base64url');
		const passwordHash = await hash(tempPassword, 12);
		const verifyToken = randomBytes(32).toString('hex');
		const verifyTokenHash = await hash(verifyToken, 10);
		const verifyExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3); // 3 days

		const created = await this.prisma.user.create({
			data: {
				countyId,
				wardId: dto.wardId ?? null,
				email: dto.email,
				phone: dto.phone ?? null,
				role: dto.role,
				passwordHash,
				emailVerified: false,
				emailVerifyToken: verifyTokenHash,
				emailVerifyExpiry: verifyExpiry,
				isActive: true,
			},
			select: userRowSelect,
		});

		return {
			data: this.toResponse(created),
			invite: {
				temporaryPassword: tempPassword,
				verifyToken,
				verifyTokenExpiresAt: verifyExpiry.toISOString(),
			},
		};
	}

	async updateUser(countyId: string | null, userId: string, dto: UpdateUserDto) {
		const target = await this.assertUserInTenant(countyId, userId);

		if (dto.role && (dto.role === UserRole.STUDENT || dto.role === UserRole.PLATFORM_OPERATOR)) {
			throw new BadRequestException('That role cannot be assigned from the user directory.');
		}

		const nextRole = dto.role ?? target.role;
		const nextWardId = dto.wardId === undefined ? target.wardId : dto.wardId;
		this.assertWardScopeMatchesRole(nextRole, nextWardId ?? undefined);

		if (dto.wardId) {
			const ward = await this.prisma.ward.findFirst({
				where: { id: dto.wardId, countyId: target.countyId },
				select: { id: true },
			});
			if (!ward) {
				throw new BadRequestException('Ward does not belong to the current tenant.');
			}
		}

		const updated = await this.prisma.user.update({
			where: { id: userId },
			data: {
				role: dto.role,
				wardId: dto.wardId === undefined ? undefined : dto.wardId,
				phone: dto.phone === undefined ? undefined : dto.phone,
			},
			select: userRowSelect,
		});

		return { data: this.toResponse(updated) };
	}

	async deactivateUser(countyId: string | null, userId: string, actorUserId: string) {
		if (userId === actorUserId) {
			throw new BadRequestException('You cannot deactivate your own account.');
		}
		const target = await this.assertUserInTenant(countyId, userId);
		if (!target.isActive) {
			return { data: this.toResponse(target) };
		}

		const updated = await this.prisma.user.update({
			where: { id: userId },
			data: { isActive: false },
			select: userRowSelect,
		});

		return { data: this.toResponse(updated) };
	}

	async reactivateUser(countyId: string | null, userId: string) {
		const target = await this.assertUserInTenant(countyId, userId);
		if (target.isActive) {
			return { data: this.toResponse(target) };
		}

		const updated = await this.prisma.user.update({
			where: { id: userId },
			data: { isActive: true },
			select: userRowSelect,
		});

		return { data: this.toResponse(updated) };
	}

	async deleteUser(countyId: string | null, userId: string, actorUserId: string) {
		if (userId === actorUserId) {
			throw new BadRequestException('You cannot delete your own account.');
		}
		const target = await this.assertUserInTenant(countyId, userId);

		const updated = await this.prisma.user.update({
			where: { id: target.id },
			data: { isActive: false, deletedAt: new Date() },
			select: userRowSelect,
		});

		return { data: this.toResponse(updated) };
	}

	private async assertUserInTenant(countyId: string | null, userId: string) {
		const target = await this.prisma.user.findFirst({
			where: { id: userId, ...(countyId ? { countyId } : {}), deletedAt: null },
			select: { ...userRowSelect, countyId: true },
		});

		if (!target) {
			throw new NotFoundException('User not found in this tenant.');
		}

		if (target.role === UserRole.STUDENT) {
			throw new ForbiddenException('Student records cannot be managed from the user directory.');
		}

		return target;
	}

	private assertWardScopeMatchesRole(role: UserRole, wardId?: string | null) {
		if (WARD_SCOPED_ROLES.has(role) && !wardId) {
			throw new BadRequestException(`Role ${role} requires a wardId.`);
		}
		if (!WARD_SCOPED_ROLES.has(role) && wardId) {
			throw new BadRequestException(`Role ${role} must not be scoped to a ward.`);
		}
	}

	private toResponse(user: UserRowSelect) {
		return {
			id: user.id,
			email: user.email,
			phone: user.phone,
			role: user.role,
			isActive: user.isActive,
			emailVerified: user.emailVerified,
			phoneVerified: user.phoneVerified,
			wardId: user.wardId,
			ward: user.ward
				? { id: user.ward.id, name: user.ward.name, code: user.ward.code }
				: null,
			lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
			createdAt: user.createdAt.toISOString(),
			updatedAt: user.updatedAt.toISOString(),
		};
	}
}
