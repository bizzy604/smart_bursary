/**
 * Purpose: Expose county-admin endpoints for tenant settings management.
 * Why important: Enables county-specific branding and form customization controls.
 * Used by: County admin settings pages in the web application.
 */
import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { County } from '../../common/decorators/county.decorator';
import { PlanTiers } from '../../common/decorators/plan-tier.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { TenantService } from './tenant.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Tenant')
@ApiBearerAuth()
@Controller('admin/settings')
export class TenantController {
	constructor(private readonly tenantService: TenantService) {}

	@Get('branding')
	@Roles(UserRole.COUNTY_ADMIN, UserRole.FINANCE_OFFICER, UserRole.WARD_ADMIN, UserRole.VILLAGE_ADMIN, UserRole.STUDENT)
	@ApiOperation({ summary: 'Get county branding settings for authenticated surfaces' })
	getBranding(@County() countyId: string) {
		return this.tenantService.getBranding(countyId);
	}

	@Get()
	@Roles(UserRole.COUNTY_ADMIN)
	@PlanTiers('STANDARD', 'ENTERPRISE')
	@ApiOperation({ summary: 'Get county tenant settings' })
	getSettings(@County() countyId: string) {
		return this.tenantService.getSettings(countyId);
	}

	@Patch()
	@Roles(UserRole.COUNTY_ADMIN)
	@PlanTiers('STANDARD', 'ENTERPRISE')
	@ApiOperation({ summary: 'Update county tenant settings' })
	@ApiBody({ type: UpdateSettingsDto })
	updateSettings(@County() countyId: string, @Body() dto: UpdateSettingsDto) {
		return this.tenantService.updateSettings(countyId, dto);
	}
}
