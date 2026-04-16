/**
 * Purpose: Persist and validate county-specific AI scoring weights.
 * Why important: Keeps score weighting configurable while enforcing safe boundaries.
 * Used by: AiController admin scoring-weights endpoint.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ScoringWeightsDto } from './dto/scoring-weights.dto';

const MAX_WEIGHT = 0.4;
const TOTAL_TARGET = 1;
const TOTAL_EPSILON = 0.0001;

@Injectable()
export class ScoringWeightsService {
	constructor(private readonly prisma: PrismaService) {}

	async updateScoringWeights(countyId: string, dto: ScoringWeightsDto) {
		const weights = Object.values(dto);

		if (weights.some((value) => value > MAX_WEIGHT)) {
			throw new BadRequestException(`No scoring weight may exceed ${MAX_WEIGHT}.`);
		}

		const totalWeight = weights.reduce((sum, value) => sum + value, 0);
		if (Math.abs(totalWeight - TOTAL_TARGET) > TOTAL_EPSILON) {
			throw new BadRequestException('All scoring weights must sum to exactly 1.0.');
		}

		const county = await this.prisma.county.findUnique({
			where: { id: countyId },
			select: { settings: true },
		});

		if (!county) {
			throw new NotFoundException('County not found.');
		}

		const settings = this.asObject(county.settings);
		const nextSettings = {
			...settings,
			scoringWeights: dto,
			scoringWeightsUpdatedAt: new Date().toISOString(),
		};

		await this.prisma.county.update({
			where: { id: countyId },
			data: { settings: nextSettings as unknown as Prisma.InputJsonValue },
		});

		return {
			data: {
				weightsUpdated: true,
				effectiveFrom: 'next cycle',
			},
		};
	}

	private asObject(value: Prisma.JsonValue): Record<string, unknown> {
		if (value && typeof value === 'object' && !Array.isArray(value)) {
			return value as Record<string, unknown>;
		}
		return {};
	}
}
