/**
 * Purpose: Orchestrate platform-operator tenant provisioning and subscription updates.
 * Why important: Bootstraps new counties with baseline wards and an initial county admin account.
 * Used by: TenantProvisioningController in B-04 tenant onboarding workflows.
 */
import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';

import { PrismaService } from '../../database/prisma.service';
import { ProvisionCountyDto, ProvisionWardDto } from './dto/provision-county.dto';
import { UpdateCountyPlanDto } from './dto/update-county-plan.dto';
import { buildNationalWardSeed, NATIONAL_WARD_SEED_SIZE } from './provisioning-ward-seed';

@Injectable()
export class ProvisioningService {
	constructor(private readonly prisma: PrismaService) {}

	getStatus() {
		return {
			ready: true,
			message: 'Tenant provisioning workflows are active.',
			defaults: {
				nationalWardSeedSize: NATIONAL_WARD_SEED_SIZE,
				defaultPlanTier: 'BASIC',
			},
		};
	}

	async listCounties() {
		const counties = await this.prisma.county.findMany({
			orderBy: { createdAt: 'desc' },
			select: {
				id: true,
				slug: true,
				name: true,
				planTier: true,
				isActive: true,
				createdAt: true,
				_count: { select: { wards: true, users: true } },
			},
		});

		return {
			data: counties.map((county) => ({
				id: county.id,
				slug: county.slug,
				name: county.name,
				planTier: county.planTier,
				isActive: county.isActive,
				wardCount: county._count.wards,
				userCount: county._count.users,
				createdAt: county.createdAt.toISOString(),
			})),
		};
	}

	async getCounty(countyId: string) {
		const county = await this.prisma.county.findUnique({
			where: { id: countyId },
			select: {
				id: true,
				slug: true,
				name: true,
				fundName: true,
				legalReference: true,
				planTier: true,
				primaryColor: true,
				isActive: true,
				createdAt: true,
				updatedAt: true,
				_count: { select: { wards: true, users: true } },
			},
		});

		if (!county) {
			throw new NotFoundException('County not found.');
		}

		return {
			data: {
				id: county.id,
				slug: county.slug,
				name: county.name,
				fundName: county.fundName,
				legalReference: county.legalReference,
				planTier: county.planTier,
				primaryColor: county.primaryColor,
				isActive: county.isActive,
				wardCount: county._count.wards,
				userCount: county._count.users,
				createdAt: county.createdAt.toISOString(),
				updatedAt: county.updatedAt.toISOString(),
			},
		};
	}

	async provisionCounty(dto: ProvisionCountyDto) {
		const slug = dto.slug.trim().toLowerCase();
		const existingCounty = await this.prisma.county.findUnique({ where: { slug } });
		if (existingCounty) {
			throw new ConflictException('County slug already exists.');
		}

		const wardSeed = this.resolveWardSeed(dto.wards);
		const adminEmail = dto.superAdmin.email.trim().toLowerCase();
		const adminPhone = this.normalizeOptionalString(dto.superAdmin.phone);
		const passwordHash = await hash(dto.superAdmin.password, 10);

		const result = await this.prisma.$transaction(async (transaction) => {
			const county = await transaction.county.create({
				data: {
					slug,
					name: dto.name.trim(),
					fundName: this.normalizeOptionalString(dto.fundName) ?? null,
					legalReference: this.normalizeOptionalString(dto.legalReference) ?? null,
					primaryColor: dto.primaryColor ?? '#1E3A5F',
					planTier: dto.planTier ?? 'BASIC',
					isActive: true,
				},
			});

			await transaction.ward.createMany({
				data: wardSeed.map((ward) => ({
					countyId: county.id,
					code: ward.code,
					name: ward.name,
					subCounty: ward.subCounty,
					isActive: true,
				})),
			});

			const superAdmin = await transaction.user.create({
				data: {
					countyId: county.id,
					email: adminEmail,
					phone: adminPhone ?? null,
					passwordHash,
					role: UserRole.COUNTY_ADMIN,
					emailVerified: true,
					phoneVerified: !!adminPhone,
					isActive: true,
				},
				select: { id: true, email: true },
			});

			return { county, superAdmin };
		});

		return {
			data: {
				countyId: result.county.id,
				slug: result.county.slug,
				name: result.county.name,
				planTier: result.county.planTier,
				wardCount: wardSeed.length,
				superAdmin: result.superAdmin,
				createdAt: result.county.createdAt.toISOString(),
			},
		};
	}

	async updateCountyPlanTier(countyId: string, dto: UpdateCountyPlanDto) {
		const county = await this.prisma.county.findUnique({ where: { id: countyId } });
		if (!county) {
			throw new NotFoundException('County not found.');
		}

		const updated = await this.prisma.county.update({
			where: { id: countyId },
			data: { planTier: dto.planTier },
			select: { id: true, slug: true, planTier: true, updatedAt: true },
		});

		return {
			data: {
				id: updated.id,
				slug: updated.slug,
				planTier: updated.planTier,
				updatedAt: updated.updatedAt.toISOString(),
			},
		};
	}

	private resolveWardSeed(wards: ProvisionWardDto[] | undefined) {
		if (!wards || wards.length === 0) {
			return buildNationalWardSeed();
		}

		const seenCodes = new Set<string>();
		return wards.map((ward) => {
			const code = ward.code.trim().toUpperCase();
			const name = ward.name.trim();
			if (!code || !name) {
				throw new BadRequestException('Ward code and name are required.');
			}

			if (seenCodes.has(code)) {
				throw new BadRequestException(`Duplicate ward code detected: ${code}`);
			}
			seenCodes.add(code);

			return {
				code,
				name,
				subCounty: this.normalizeOptionalString(ward.subCounty) ?? undefined,
			};
		});
	}

	private normalizeOptionalString(value: string | undefined): string | undefined {
		if (value === undefined) {
			return undefined;
		}

		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : undefined;
	}
}
