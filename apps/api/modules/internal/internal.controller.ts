/**
 * Purpose: Expose internal-only endpoints used by the AI scoring service.
 * Why important: Accepts signed AI score payloads without exposing them to public clients.
 * Used by: AI scoring service integrations during P5 workflow.
 */
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiHeader, ApiTags } from '@nestjs/swagger';

import { AiScoreService } from '../ai/ai-score.service';
import { IngestAiScoreDto } from './dto/ingest-ai-score.dto';
import { ServiceAuthGuard } from './service-auth.guard';

@UseGuards(ServiceAuthGuard)
@ApiTags('Internal')
@Controller('internal')
export class InternalController {
	constructor(private readonly aiScoreService: AiScoreService) {}

	@Post('ai-scores')
	@ApiHeader({ name: 'X-Service-Key', required: true })
	@ApiBody({ type: IngestAiScoreDto })
	ingestAiScore(@Body() dto: IngestAiScoreDto) {
		return this.aiScoreService.ingestScoreCard(dto);
	}
}
