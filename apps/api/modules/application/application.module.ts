/**
 * Purpose: Wire application service and controller dependencies.
 * Why important: Establishes the module boundary for application lifecycle workflows.
 * Used by: AppModule imports.
 */
import { Module } from '@nestjs/common';

import { ApplicationController } from './application.controller';
import { ApplicationService } from './application.service';

@Module({
	controllers: [ApplicationController],
	providers: [ApplicationService],
	exports: [ApplicationService],
})
export class ApplicationModule {}
