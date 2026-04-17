/**
 * Purpose: Wire tenant settings and provisioning services within a bounded module.
 * Why important: Isolates tenant-focused APIs from other monolith domains.
 * Used by: AppModule and county admin settings workflows.
 */
import { Module } from '@nestjs/common';

import { TenantController } from './tenant.controller';
import { ProvisioningService } from './provisioning.service';
import { TenantService } from './tenant.service';

@Module({
	controllers: [TenantController],
	providers: [TenantService, ProvisioningService],
	exports: [TenantService],
})
export class TenantModule {}
