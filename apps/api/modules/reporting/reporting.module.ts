/**
 * Purpose: Wire reporting controller and service.
 * Why important: Makes the reporting endpoints available to the app.
 * Used by: AppModule.
 */
import { Module } from '@nestjs/common';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';

@Module({
	controllers: [ReportingController],
	providers: [ReportingService],
})
export class ReportingModule {}
