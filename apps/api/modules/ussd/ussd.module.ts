/**
 * Purpose: Wire the USSD discovery channel module.
 * Why important: Bundles the AT callback endpoint with its menu state machine
 *                so it can be imported into AppModule without leaking deps.
 * Used by: AppModule.imports.
 */
import { Module } from '@nestjs/common';

import { UssdController } from './ussd.controller';
import { UssdService } from './ussd.service';

@Module({
	controllers: [UssdController],
	providers: [UssdService],
	exports: [UssdService],
})
export class UssdModule {}
