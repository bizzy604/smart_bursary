/**
 * Purpose: Wire tenant settings and provisioning services within a bounded module.
 * Why important: Isolates tenant-focused APIs from other monolith domains.
 * Used by: AppModule and county admin settings workflows.
 */
import { Module } from '@nestjs/common';

import { TenantController } from './tenant.controller';
import { ProvisioningService } from './provisioning.service';
import { TenantProvisioningController } from './tenant-provisioning.controller';
import { TenantService } from './tenant.service';

@Module({
	controllers: [TenantController, TenantProvisioningController],
	providers: [TenantService, ProvisioningService],
	exports: [TenantService],
})
export class TenantModule {}
