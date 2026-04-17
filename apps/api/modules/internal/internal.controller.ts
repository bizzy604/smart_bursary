/**
 * Purpose: Expose internal-only endpoints used by the AI scoring service.
 * Why important: Accepts signed AI score payloads without exposing them to public clients.
 * Used by: AI scoring service integrations during P5 workflow.
 */
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiHeader, ApiParam, ApiTags } from '@nestjs/swagger';

import { AiScoreService } from '../ai/ai-score.service';
import { IngestAiScoreDto } from './dto/ingest-ai-score.dto';
import { InternalApplicationQueryService } from './internal-application-query.service';
import { ServiceAuthGuard } from './service-auth.guard';

@UseGuards(ServiceAuthGuard)
@ApiTags('Internal')
@Controller('internal')
export class InternalController {
	constructor(
		private readonly aiScoreService: AiScoreService,
		private readonly internalApplicationQueryService: InternalApplicationQueryService,
	) {}

	@Get('applications/:id')
	@ApiHeader({ name: 'X-Service-Key', required: true })
	@ApiParam({ name: 'id', description: 'Application identifier' })
	getApplicationForScoring(@Param('id') applicationId: string) {
		return this.internalApplicationQueryService.getScoringPayload(applicationId);
	}

	@Post('ai-scores')
	@ApiHeader({ name: 'X-Service-Key', required: true })
	@ApiBody({ type: IngestAiScoreDto })
	ingestAiScore(@Body() dto: IngestAiScoreDto) {
		return this.aiScoreService.ingestScoreCard(dto);
	}
}
