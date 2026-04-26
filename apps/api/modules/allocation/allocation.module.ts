/**
 * Purpose: Wire the allocation controller, services, and notification dependency.
 * Why important: Defines the AllocationModule boundary in the modular monolith and exports
 *                services that downstream modules (Disbursement, Reporting) can consume.
 * Used by: AppModule imports for the §7 money-integrity flow.
 */
import { Module } from '@nestjs/common';

import { NotificationModule } from '../notification/notification.module';
import { AllocationController } from './allocation.controller';
import { AllocationAvailabilityService } from './services/allocation-availability.service';
import { StudentAllocationService } from './services/student-allocation.service';
import { VillageBudgetAllocationService } from './services/village-budget-allocation.service';
import { WardBudgetAllocationService } from './services/ward-budget-allocation.service';

@Module({
	imports: [NotificationModule],
	controllers: [AllocationController],
	providers: [
		WardBudgetAllocationService,
		VillageBudgetAllocationService,
		StudentAllocationService,
		AllocationAvailabilityService,
	],
	exports: [
		WardBudgetAllocationService,
		VillageBudgetAllocationService,
		StudentAllocationService,
		AllocationAvailabilityService,
	],
})
export class AllocationModule {}
