/**
 * Purpose: Validate and persist application section payloads with canonical field mapping.
 * Why important: Ensures section data fidelity and keeps section-level workflow rules out of controllers.
 * Used by: ApplicationController update-section endpoint.
 */
import { BadRequestException, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ValidationError, validate } from 'class-validator';

import { PrismaService } from '../../database/prisma.service';
import { SectionADto } from './dto/section-a.dto';
import { SectionBDto } from './dto/section-b.dto';
import { SectionCDto } from './dto/section-c.dto';
import { SectionDDto } from './dto/section-d.dto';
import { SectionEDto } from './dto/section-e.dto';
import { SectionFDto } from './dto/section-f.dto';
import { SectionKey, UpdateApplicationSectionDto } from './dto/update-application-section.dto';

type SectionPayload =
	| SectionADto
	| SectionBDto
	| SectionCDto
	| SectionDDto
	| SectionEDto
	| SectionFDto;

type SectionPayloadClass = new () => SectionPayload;

const SECTION_PAYLOAD_CLASS_MAP: Record<SectionKey, SectionPayloadClass> = {
	'section-a': SectionADto,
	'section-b': SectionBDto,
	'section-c': SectionCDto,
	'section-d': SectionDDto,
	'section-e': SectionEDto,
	'section-f': SectionFDto,
};

@Injectable()
export class SectionService {
	constructor(private readonly prisma: PrismaService) {}

	async updateSection(
		countyId: string,
		applicantId: string,
		applicationId: string,
		dto: UpdateApplicationSectionDto,
	) {
		const application = await this.prisma.application.findFirst({
			where: {
				id: applicationId,
				countyId,
				applicantId,
				status: 'DRAFT',
			},
			select: { id: true },
		});

		if (!application) {
			throw new BadRequestException('Application not found or no longer in draft state.');
		}

		const parsedPayload = this.parseSectionPayload(dto.data);
		const normalizedPayload = await this.validateSectionPayload(dto.sectionKey, parsedPayload);

		const section = await this.prisma.applicationSection.upsert({
			where: {
				applicationId_sectionKey: {
					applicationId,
					sectionKey: dto.sectionKey,
				},
			},
			update: {
				data: normalizedPayload as never,
				isComplete: true,
				savedAt: new Date(),
			},
			create: {
				applicationId,
				countyId,
				sectionKey: dto.sectionKey,
				data: normalizedPayload as never,
				isComplete: true,
			},
			select: {
				sectionKey: true,
				data: true,
				isComplete: true,
				savedAt: true,
			},
		});

		await this.syncApplicationSummary(applicationId, dto.sectionKey, normalizedPayload);

		return section;
	}

	private parseSectionPayload(serializedData: string): unknown {
		try {
			return JSON.parse(serializedData);
		} catch {
			throw new BadRequestException('Invalid JSON in section data.');
		}
	}

	private async validateSectionPayload(
		sectionKey: SectionKey,
		rawPayload: unknown,
	): Promise<Record<string, unknown>> {
		const dtoClass = SECTION_PAYLOAD_CLASS_MAP[sectionKey];
		const payload = plainToInstance(dtoClass, rawPayload) as SectionPayload;

		const validationErrors = await validate(payload, {
			whitelist: true,
			forbidNonWhitelisted: true,
		});

		if (validationErrors.length > 0) {
			const flattenedErrors = this.flattenValidationErrors(validationErrors);
			console.error(`Validation failed for ${sectionKey}:`, JSON.stringify(flattenedErrors, null, 2));
			console.error(`Raw payload for ${sectionKey}:`, JSON.stringify(rawPayload, null, 2));
			throw new BadRequestException({
				code: 'VALIDATION_ERROR',
				message: 'Section payload contains invalid or incomplete fields.',
				details: flattenedErrors,
			});
		}

		return JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
	}

	private flattenValidationErrors(
		errors: ValidationError[],
		parentPath = '',
	): Array<{ field: string; message: string }> {
		const details: Array<{ field: string; message: string }> = [];

		for (const error of errors) {
			const field = parentPath ? `${parentPath}.${error.property}` : error.property;
			if (error.constraints) {
				for (const message of Object.values(error.constraints)) {
					details.push({ field, message });
				}
			}

			if (error.children && error.children.length > 0) {
				details.push(...this.flattenValidationErrors(error.children, field));
			}
		}

		return details;
	}

	private async syncApplicationSummary(
		applicationId: string,
		sectionKey: SectionKey,
		payload: Record<string, unknown>,
	): Promise<void> {
		if (sectionKey !== 'section-b') {
			return;
		}

		const sectionB = payload as unknown as SectionBDto;
		await this.prisma.application.update({
			where: { id: applicationId },
			data: {
				totalFeeKes: sectionB.totalFeeKes,
				outstandingBalance: sectionB.feeBalanceKes,
				amountAbleToPay: sectionB.sponsorSupportKes ?? null,
				amountRequested: sectionB.requestedKes,
				helbApplied: sectionB.helbApplied,
				priorBursaryReceived: sectionB.priorBursaryReceived,
				priorBursarySource: sectionB.priorBursaryReceived
					? sectionB.priorBursarySource
					: null,
				priorBursaryAmount: sectionB.priorBursaryReceived
					? sectionB.priorBursaryAmountKes ?? null
					: null,
				reason: sectionB.reasonForSupport,
			},
		});
	}
}
