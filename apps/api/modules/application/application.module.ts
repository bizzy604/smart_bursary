/**
 * Purpose: Wire application service and controller dependencies.
 * Why important: Establishes the module boundary for application lifecycle workflows.
 * Used by: AppModule imports.
 */
import { Module } from '@nestjs/common';

import { NotificationModule } from '../notification/notification.module';
import { ProfileModule } from '../profile/profile.module';
import { ProgramModule } from '../program/program.module';
import { QueueModule } from '../../queue/queue.module';
import { ApplicationAuditService } from './application-audit.service';
import { ApplicationAiScoringService } from './application-ai-scoring.service';
import { ApplicationSubmissionService } from './application-submission.service';
import { ApplicationController } from './application.controller';
import { ApplicationService } from './application.service';
import { SectionService } from './section.service';

@Module({
	imports: [ProgramModule, ProfileModule, QueueModule, NotificationModule],
	controllers: [ApplicationController],
	providers: [
		ApplicationAuditService,
		ApplicationService,
		ApplicationSubmissionService,
		ApplicationAiScoringService,
		SectionService,
	],
	exports: [ApplicationService],
})
export class ApplicationModule {}
