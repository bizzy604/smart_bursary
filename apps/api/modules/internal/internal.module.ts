/**
 * Purpose: Wire internal service-authenticated endpoints.
 * Why important: Isolates VPC-only write operations from public API modules.
 * Used by: AppModule imports and AI scoring service integrations.
 */
import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { InternalController } from './internal.controller';
import { InternalApplicationQueryService } from './internal-application-query.service';
import { ServiceAuthGuard } from './service-auth.guard';

@Module({
	imports: [AiModule],
	controllers: [InternalController],
	providers: [ServiceAuthGuard, InternalApplicationQueryService],
})
export class InternalModule {}
