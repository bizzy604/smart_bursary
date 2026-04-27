/**
 * Purpose: Generate PDF documents for applications using pdfkit
 * Why important: Provides reliable server-side PDF generation with logo and QR code support
 * Used by: Frontend for downloading application PDFs
 */
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

import { County } from '../../common/decorators/county.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApplicationPdfService } from './application-pdf.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Application')
@ApiBearerAuth()
@Controller('applications')
export class ApplicationPdfController {
	constructor(private readonly applicationPdfService: ApplicationPdfService) {}

	@Post('pdf')
	@ApiOperation({ summary: 'Generate application PDF' })
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				applicationId: { type: 'string' },
			},
			required: ['applicationId'],
		},
	})
	async generatePdf(@County() countyId: string, @Body() body: { applicationId: string }) {
		return this.applicationPdfService.generateApplicationPdf(countyId, body.applicationId);
	}
}
