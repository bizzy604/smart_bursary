/**
 * Purpose: Wire program service and controller dependencies.
 * Why important: Establishes the module boundary for program queries.
 * Used by: AppModule imports.
 */
import { Module } from '@nestjs/common';

import { EligibilityService } from './eligibility.service';
import { ProgramController } from './program.controller';
import { ProgramLifecycleService } from './program-lifecycle.service';
import { ProgramService } from './program.service';

@Module({
	controllers: [ProgramController],
	providers: [ProgramService, ProgramLifecycleService, EligibilityService],
	exports: [ProgramService, EligibilityService],
})
export class ProgramModule {}
