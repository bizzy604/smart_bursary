/**
 * Purpose: Register the shared Redis client as a reusable application module.
 * Why important: Keeps Redis access behind a single Nest boundary for auth and other services.
 * Used by: AppModule and feature modules that need Redis state.
 */

import { Global, Module } from '@nestjs/common';

import { RedisService } from './redis.service';

@Global()
@Module({
	providers: [RedisService],
	exports: [RedisService],
})
export class RedisModule {}
