/**
 * Purpose: Wire AI score query and scoring weight services.
 * Why important: Defines AI-related module boundary for P5 workflow integration.
 * Used by: AppModule and InternalModule for score retrieval and ingestion.
 */
import { Module } from '@nestjs/common';

import { AiController } from './ai.controller';
import { AiScoreService } from './ai-score.service';
import { ScoringWeightsService } from './scoring-weights.service';

@Module({
	controllers: [AiController],
	providers: [AiScoreService, ScoringWeightsService],
	exports: [AiScoreService],
})
export class AiModule {}
