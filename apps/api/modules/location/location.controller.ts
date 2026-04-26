/**
 * Purpose: Expose geographic hierarchy endpoints for dropdowns and county admin management.
 * Why important: Centralizes SubCounty, Ward, and VillageUnit lookups and mutations.
 * Used by: Student application forms, county admin settings, and auth county picker.
 */
import {
	Body,
	Controller,
	Get,
	Post,
	Query,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { County } from '../../common/decorators/county.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('Locations')
@Controller('locations')
export class LocationController {
	constructor(private readonly prisma: PrismaService) {}

	@Get('sub-counties')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'List sub-counties for the current county' })
	async listSubCounties(@County() countyId: string) {
		const rows = await this.prisma.subCounty.findMany({
			where: { countyId },
			orderBy: { name: 'asc' },
			select: { id: true, name: true, code: true },
		});
		return { data: rows };
	}

	@Get('wards')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'List wards for a county (optionally filtered by sub-county)' })
	async listWards(
		@County() countyId: string,
		@Query('subCountyId') subCountyId?: string,
	) {
		const where: Record<string, unknown> = { countyId };
		if (subCountyId) {
			where.subCountyId = subCountyId;
		}
		const rows = await this.prisma.ward.findMany({
			where,
			orderBy: { name: 'asc' },
			select: { id: true, name: true, code: true, subCountyId: true },
		});
		return { data: rows };
	}

	@Get('village-units')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'List village units for a ward or all village units for the county' })
	async listVillageUnits(
		@County() countyId: string,
		@Query('wardId') wardId?: string,
	) {
		const where: Record<string, unknown> = wardId ? { wardId } : { countyId };
		const rows = await this.prisma.villageUnit.findMany({
			where,
			orderBy: { name: 'asc' },
			select: { id: true, name: true, code: true, wardId: true },
		});
		return { data: rows };
	}

	@Post('sub-counties')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@Roles(UserRole.COUNTY_ADMIN)
	@ApiOperation({ summary: 'Create a sub-county in the current county' })
	async createSubCounty(
		@County() countyId: string,
		@Body() body: { name: string; code?: string },
	) {
		try {
			const row = await this.prisma.subCounty.create({
				data: {
					countyId,
					name: body.name,
					code: body.code ?? null,
				},
				select: { id: true, name: true, code: true },
			});
			return { data: row };
		} catch (error: unknown) {
			if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
				return { error: 'A sub-county with this code already exists in this county.' };
			}
			throw error;
		}
	}

	@Post('wards')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@Roles(UserRole.COUNTY_ADMIN)
	@ApiOperation({ summary: 'Create a ward in the current county' })
	async createWard(
		@County() countyId: string,
		@Body() body: { name: string; code?: string; subCountyId?: string },
	) {
		try {
			const row = await this.prisma.ward.create({
				data: {
					countyId,
					name: body.name,
					code: body.code ?? null,
					subCountyId: body.subCountyId ?? null,
				},
				select: { id: true, name: true, code: true, subCountyId: true },
			});
			return { data: row };
		} catch (error: unknown) {
			if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
				return { error: 'A ward with this code already exists in this county.' };
			}
			throw error;
		}
	}

	@Post('village-units')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@Roles(UserRole.COUNTY_ADMIN)
	@ApiOperation({ summary: 'Create a village unit under a ward' })
	async createVillageUnit(
		@County() countyId: string,
		@Body() body: { name: string; code?: string; wardId: string },
	) {
		// Verify the ward belongs to the county
		const ward = await this.prisma.ward.findFirst({
			where: { id: body.wardId, countyId },
			select: { id: true },
		});
		if (!ward) {
			return { error: 'Ward not found in this county.' };
		}
		try {
			const row = await this.prisma.villageUnit.create({
				data: {
					countyId,
					wardId: body.wardId,
					name: body.name,
					code: body.code ?? null,
				},
				select: { id: true, name: true, code: true, wardId: true },
			});
			return { data: row };
		} catch (error: unknown) {
			if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
				return { error: 'A village unit with this name already exists in this ward.' };
			}
			throw error;
		}
	}
}
