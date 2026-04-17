/**
 * Purpose: Execute queued AI scoring jobs by invoking the FastAPI scoring service.
 * Why important: Connects submission-time queue jobs to the external AI scoring runtime.
 * Used by: QueueService ai-scoring worker and in-process queue fallback.
 */
import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import axios, { AxiosError } from 'axios';
import { Job } from 'bullmq';

import { PrismaService } from '../../database/prisma.service';
import { resolveScoringWeights, scoringWeightsToRecord } from '../../modules/ai/scoring-weights.constants';

export type AiScoringJobData = {
	applicationId: string;
	countyId: string;
};

export class AiScoringProcessor {
	private readonly logger = new Logger(AiScoringProcessor.name);

	constructor(private readonly prisma: PrismaService) {}

	async process(job: Job<AiScoringJobData>) {
		return this.processData(job.data);
	}

	async processData(data: AiScoringJobData) {
		const aiServiceUrl = this.resolveAiServiceUrl();
		const scoringWeights = await this.resolveCountyScoringWeights(data.countyId);

		try {
			const response = await axios.post(
				`${aiServiceUrl}/score`,
				{
					application_id: data.applicationId,
					county_id: data.countyId,
					weights: scoringWeights,
				},
				{
					headers: { 'Content-Type': 'application/json' },
					timeout: this.resolveTimeoutMs(),
				},
			);

			return response.data;
		} catch (error) {
			const message = this.resolveErrorMessage(error);
			this.logger.error(
				`AI scoring processor failed for application ${data.applicationId}: ${message}`,
			);

			await this.recordFailureTimeline(data, message);
			throw error;
		}
	}

	private async resolveCountyScoringWeights(countyId: string): Promise<Record<string, number>> {
		const county = await this.prisma.county.findUnique({
			where: { id: countyId },
			select: { settings: true },
		});

		const settings =
			county?.settings && typeof county.settings === 'object' && !Array.isArray(county.settings)
				? (county.settings as Record<string, unknown>)
				: {};

		return scoringWeightsToRecord(resolveScoringWeights(settings.scoringWeights));
	}

	private resolveAiServiceUrl(): string {
		const configuredUrl =
			process.env.AI_SCORING_SERVICE_URL ??
			process.env.AI_SERVICE_URL ??
			'http://127.0.0.1:8000';

		return configuredUrl.replace(/\/+$/, '');
	}

	private resolveTimeoutMs(): number {
		const rawTimeout = process.env.AI_SCORING_REQUEST_TIMEOUT_MS ?? '5000';
		const parsedTimeout = Number.parseInt(rawTimeout, 10);
		return Number.isFinite(parsedTimeout) && parsedTimeout > 0
			? parsedTimeout
			: 5000;
	}

	private resolveErrorMessage(error: unknown): string {
		if (error instanceof AxiosError) {
			if (error.response) {
				return `AI scoring service returned status ${error.response.status}`;
			}

			return error.message;
		}

		if (error instanceof Error) {
			return error.message;
		}

		return 'Unknown error';
	}

	private async recordFailureTimeline(
		data: AiScoringJobData,
		message: string,
	): Promise<void> {
		const application = await this.prisma.application.findFirst({
			where: { id: data.applicationId, countyId: data.countyId },
			select: {
				id: true,
				countyId: true,
				status: true,
			},
		});

		if (!application) {
			return;
		}

		await this.prisma.applicationTimeline.create({
			data: {
				applicationId: application.id,
				countyId: application.countyId,
				eventType: 'AI_SCORING_FAILED',
				fromStatus: application.status,
				toStatus: application.status,
				metadata: {
					message,
					queue: 'ai-scoring',
				} as Prisma.InputJsonValue,
			},
		});
	}
}
