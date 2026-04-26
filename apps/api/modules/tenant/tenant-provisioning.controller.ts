/**
 * Purpose: Expose platform-operator APIs for county tenant provisioning and plan control.
 * Why important: Allows SaaS operators to bootstrap and manage tenant subscriptions safely.
 * Used by: B-04 tenant provisioning workflows and operations tooling.
 */
import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Patch,
	Post,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ProvisionCountyDto } from './dto/provision-county.dto';
import { UpdateCountyPlanDto } from './dto/update-county-plan.dto';
import { ProvisioningService } from './provisioning.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Tenant')
@ApiBearerAuth()
@Controller('platform/tenants')
export class TenantProvisioningController {
	constructor(private readonly provisioningService: ProvisioningService) {}

	@Get('status')
	@Roles(UserRole.PLATFORM_OPERATOR)
	@ApiOperation({ summary: 'Get tenant provisioning readiness status' })
	getStatus() {
		return this.provisioningService.getStatus();
	}

	@Get()
	@Roles(UserRole.PLATFORM_OPERATOR)
	@ApiOperation({ summary: 'List provisioned counties' })
	listCounties() {
		return this.provisioningService.listCounties();
	}

	@Get(':id')
	@Roles(UserRole.PLATFORM_OPERATOR)
	@ApiOperation({ summary: 'Get provisioned county detail' })
	@ApiParam({ name: 'id', description: 'County identifier' })
	getCounty(@Param('id') countyId: string) {
		return this.provisioningService.getCounty(countyId);
	}

	@Post()
	@Roles(UserRole.PLATFORM_OPERATOR)
	@ApiOperation({ summary: 'Provision a county tenant and bootstrap ward/admin records' })
	@ApiBody({ type: ProvisionCountyDto })
	provisionCounty(@Body() dto: ProvisionCountyDto) {
		return this.provisioningService.provisionCounty(dto);
	}

	@Patch(':id/plan-tier')
	@Roles(UserRole.PLATFORM_OPERATOR)
	@ApiOperation({ summary: 'Update county subscription plan tier' })
	@ApiParam({ name: 'id', description: 'County identifier' })
	@ApiBody({ type: UpdateCountyPlanDto })
	updateCountyPlanTier(@Param('id') countyId: string, @Body() dto: UpdateCountyPlanDto) {
		return this.provisioningService.updateCountyPlanTier(countyId, dto);
	}

	@Post(':id/deactivate')
	@HttpCode(HttpStatus.OK)
	@Roles(UserRole.PLATFORM_OPERATOR)
	@ApiOperation({ summary: 'Deactivate a county tenant (suspends access)' })
	@ApiParam({ name: 'id', description: 'County identifier' })
	deactivateCounty(@Param('id') countyId: string) {
		return this.provisioningService.deactivateCounty(countyId);
	}

	@Post(':id/reactivate')
	@HttpCode(HttpStatus.OK)
	@Roles(UserRole.PLATFORM_OPERATOR)
	@ApiOperation({ summary: 'Reactivate a previously deactivated county tenant' })
	@ApiParam({ name: 'id', description: 'County identifier' })
	reactivateCounty(@Param('id') countyId: string) {
		return this.provisioningService.reactivateCounty(countyId);
	}

	@Delete(':id')
	@HttpCode(HttpStatus.OK)
	@Roles(UserRole.PLATFORM_OPERATOR)
	@ApiOperation({ summary: 'Soft-delete a county tenant (removes from registry)' })
	@ApiParam({ name: 'id', description: 'County identifier' })
	softDeleteCounty(@Param('id') countyId: string) {
		return this.provisioningService.softDeleteCounty(countyId);
	}
}
