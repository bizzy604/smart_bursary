/**
 * Purpose: Wire application service and controller dependencies.
 * Why important: Establishes the module boundary for application lifecycle workflows.
 * Used by: AppModule imports.
 */
import { Module } from '@nestjs/common';

import { ProfileModule } from '../profile/profile.module';
import { ProgramModule } from '../program/program.module';
import { QueueModule } from '../../queue/queue.module';
import { ApplicationSubmissionService } from './application-submission.service';
import { ApplicationController } from './application.controller';
import { ApplicationService } from './application.service';
import { SectionService } from './section.service';

@Module({
	imports: [ProgramModule, ProfileModule, QueueModule],
	controllers: [ApplicationController],
	providers: [ApplicationService, ApplicationSubmissionService, SectionService],
	exports: [ApplicationService],
})
export class ApplicationModule {}
