/**
 * Purpose: Wire location controller into the API.
 */
import { Module } from '@nestjs/common';

import { LocationController } from './location.controller';

@Module({
	controllers: [LocationController],
})
export class LocationModule {}
