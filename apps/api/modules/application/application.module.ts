/**
 * Purpose: Wire application service and controller dependencies.
 * Why important: Establishes the module boundary for application lifecycle workflows.
 * Used by: AppModule imports.
 */
import { Module } from '@nestjs/common';

import { IdentityModule } from '../identity/identity.module';
import { NotificationModule } from '../notification/notification.module';
import { ProfileModule } from '../profile/profile.module';
import { ProgramModule } from '../program/program.module';
import { QueueModule } from '../../queue/queue.module';
import { DocumentModule } from '../document/document.module';
import { ApplicationAuditService } from './application-audit.service';
import { ApplicationAiScoringService } from './application-ai-scoring.service';
import { ApplicationLifecycleService } from './application-lifecycle.service';
import { ApplicationSubmissionService } from './application-submission.service';
import { ApplicationController } from './application.controller';
import { ApplicationPdfController } from './application-pdf.controller';
import { ApplicationPdfService } from './application-pdf.service';
import { ApplicationService } from './application.service';
import { SectionService } from './section.service';

@Module({
	imports: [ProgramModule, ProfileModule, QueueModule, NotificationModule, IdentityModule, DocumentModule],
	controllers: [ApplicationController, ApplicationPdfController],
	providers: [
		ApplicationAuditService,
		ApplicationLifecycleService,
		ApplicationService,
		ApplicationSubmissionService,
		ApplicationAiScoringService,
		SectionService,
		ApplicationPdfService,
	],
	exports: [ApplicationService],
})
export class ApplicationModule {}
