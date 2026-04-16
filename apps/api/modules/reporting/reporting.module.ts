/**
 * Purpose: Wire reporting controller and service.
 * Why important: Makes the reporting endpoints available to the app.
 * Used by: AppModule.
 */
import { Module } from '@nestjs/common';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';
import { DashboardService } from './dashboard.service';
import { OcobReportService } from './ocob-report.service';
import { ExportService } from './export.service';

@Module({
	controllers: [ReportingController],
	providers: [ReportingService, DashboardService, OcobReportService, ExportService],
})
export class ReportingModule {}
