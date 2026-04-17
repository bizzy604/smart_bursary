/**
 * Purpose: Wire disbursement controller and service.
 * Why important: Makes the disbursement endpoints available to the app.
 * Used by: AppModule.
 */
import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { DisbursementController } from './disbursement.controller';
import { DisbursementExecutionService } from './disbursement-execution.service';
import { DisbursementExportService } from './disbursement-export.service';
import { DisbursementQueryService } from './disbursement-query.service';
import { DisbursementQueueService } from './disbursement-queue.service';
import { DisbursementService } from './disbursement.service';
import { MpesaService } from './mpesa.service';
import { EftExportService } from './eft-export.service';
import { ReceiptService } from './receipt.service';

@Module({
	imports: [NotificationModule],
	controllers: [DisbursementController],
	providers: [
		DisbursementService,
		DisbursementQueryService,
		DisbursementExportService,
		DisbursementExecutionService,
		DisbursementQueueService,
		MpesaService,
		EftExportService,
		ReceiptService,
	],
})
export class DisbursementModule {}
