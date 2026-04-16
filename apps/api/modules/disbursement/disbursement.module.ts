/**
 * Purpose: Wire disbursement controller and service.
 * Why important: Makes the disbursement endpoints available to the app.
 * Used by: AppModule.
 */
import { Module } from '@nestjs/common';
import { DisbursementController } from './disbursement.controller';
import { DisbursementService } from './disbursement.service';
import { MpesaService } from './mpesa.service';
import { EftExportService } from './eft-export.service';
import { ReceiptService } from './receipt.service';

@Module({
	controllers: [DisbursementController],
	providers: [DisbursementService, MpesaService, EftExportService, ReceiptService],
})
export class DisbursementModule {}
