/**
 * Purpose: Wire the cross-county identity registry service.
 * Why important: Defines the IdentityModule boundary in the modular monolith and exports
 *                IdentityRegistryService for downstream consumers (ApplicationSubmissionService,
 *                ReviewModule, AI anomaly detection).
 * Used by: AppModule imports for the §5.3 L2 cross-county active-cycle lock.
 */
import { Module } from '@nestjs/common';

import { IdentityRegistryService } from './services/identity-registry.service';

@Module({
	providers: [IdentityRegistryService],
	exports: [IdentityRegistryService],
})
export class IdentityModule {}
