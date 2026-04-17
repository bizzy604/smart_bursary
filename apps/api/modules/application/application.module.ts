/**
 * Purpose: Wire application service and controller dependencies.
 * Why important: Establishes the module boundary for application lifecycle workflows.
 * Used by: AppModule imports.
 */
import { Module } from '@nestjs/common';

import { ProfileModule } from '../profile/profile.module';
import { ProgramModule } from '../program/program.module';
import { ApplicationSubmissionService } from './application-submission.service';
import { ApplicationController } from './application.controller';
import { ApplicationService } from './application.service';

@Module({
	imports: [ProgramModule, ProfileModule],
	controllers: [ApplicationController],
	providers: [ApplicationService, ApplicationSubmissionService],
	exports: [ApplicationService],
})
export class ApplicationModule {}
