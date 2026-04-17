/**
 * Purpose: Enforce eligibility and semantic submission errors for application actions.
 * Why important: Keeps application lifecycle semantics aligned with API contract without bloating core workflow service.
 * Used by: ApplicationController draft creation and submit endpoints.
 */
import {
	ConflictException,
	Injectable,
	Logger,
	UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { QueueService } from '../../queue/queue.service';
import { ProfileCompletionService } from '../profile/profile-completion.service';
import { EligibilityService } from '../program/eligibility.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { ApplicationService } from './application.service';

@Injectable()
export class ApplicationSubmissionService {
	private readonly logger = new Logger(ApplicationSubmissionService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly eligibilityService: EligibilityService,
		private readonly profileCompletionService: ProfileCompletionService,
		private readonly applicationService: ApplicationService,
		private readonly queueService: QueueService,
	) {}

	async createDraft(
		countyId: string,
		applicantId: string,
		dto: CreateApplicationDto,
	) {
		const existingApplication = await this.prisma.application.findFirst({
			where: {
				countyId,
				applicantId,
				programId: dto.programId,
			},
			select: {
				id: true,
				status: true,
				submittedAt: true,
			},
		});

		if (existingApplication) {
			throw new ConflictException({
				code: 'DUPLICATE_APPLICATION',
				message: 'An application for this program already exists for this student.',
				details: {
					applicationId: existingApplication.id,
					status: existingApplication.status,
					submittedAt: existingApplication.submittedAt,
				},
			});
		}

		const activeProgram = await this.prisma.bursaryProgram.findFirst({
			where: { id: dto.programId, countyId, status: 'ACTIVE' },
			select: { id: true },
		});

		if (!activeProgram) {
			return this.applicationService.createDraft(countyId, applicantId, dto);
		}

		const eligibility = await this.eligibilityService.evaluateProgramById(
			countyId,
			applicantId,
			dto.programId,
		);
		if (!eligibility.eligible) {
			this.throwIneligible(
				eligibility.ineligibilityReason ?? 'Student does not meet program eligibility criteria.',
			);
		}

		return this.applicationService.createDraft(countyId, applicantId, dto);
	}

	async submitApplication(
		countyId: string,
		applicantId: string,
		dto: SubmitApplicationDto,
	) {
		const draftApplication = await this.prisma.application.findFirst({
			where: {
				id: dto.applicationId,
				countyId,
				applicantId,
				status: 'DRAFT',
			},
			select: { programId: true },
		});

		if (!draftApplication) {
			return this.applicationService.submitApplication(countyId, applicantId, dto);
		}

		const program = await this.prisma.bursaryProgram.findUnique({
			where: { id: draftApplication.programId },
			select: { closesAt: true },
		});

		if (!program) {
			return this.applicationService.submitApplication(countyId, applicantId, dto);
		}

		if (program.closesAt < new Date()) {
			throw new UnprocessableEntityException({
				code: 'PROGRAM_CLOSED',
				message: 'Program submission window has closed.',
			});
		}

		const eligibility = await this.eligibilityService.evaluateProgramById(
			countyId,
			applicantId,
			draftApplication.programId,
		);
		if (!eligibility.eligible) {
			this.throwIneligible(
				eligibility.ineligibilityReason ?? 'Student does not meet program eligibility criteria.',
			);
		}

		await this.profileCompletionService.assertSubmissionReady(countyId, applicantId);

		const submitted = await this.applicationService.submitApplication(
			countyId,
			applicantId,
			dto,
		);

		await this.enqueueAiScoring(submitted.id, countyId, submitted.status);

		return submitted;
	}

	private throwIneligible(reason: string): never {
		throw new UnprocessableEntityException({
			code: 'INELIGIBLE',
			message: reason,
		});
	}

	private async enqueueAiScoring(
		applicationId: string,
		countyId: string,
		status: string,
	): Promise<void> {
		try {
			await this.queueService.getAiScoringQueue().add('score-application', {
				applicationId,
				countyId,
			});

			await this.safeRecordAiTimeline(
				applicationId,
				countyId,
				'AI_SCORING_QUEUED',
				status,
				'AI scoring job queued successfully.',
			);
		} catch (error) {
			const message = this.resolveErrorMessage(error);
			this.logger.error(
				`Failed to enqueue AI scoring for application ${applicationId}: ${message}`,
			);

			await this.safeRecordAiTimeline(
				applicationId,
				countyId,
				'AI_SCORING_QUEUE_FAILED',
				status,
				message,
			);
		}
	}

	private async safeRecordAiTimeline(
		applicationId: string,
		countyId: string,
		eventType: string,
		status: string,
		message: string,
	): Promise<void> {
		try {
			await this.prisma.applicationTimeline.create({
				data: {
					applicationId,
					countyId,
					eventType,
					fromStatus: status,
					toStatus: status,
					metadata: {
						message,
						queue: 'ai-scoring',
					} as Prisma.InputJsonValue,
				},
			});
		} catch (error) {
			this.logger.warn(
				`Failed to persist timeline event ${eventType} for application ${applicationId}: ${this.resolveErrorMessage(error)}`,
			);
		}
	}

	private resolveErrorMessage(error: unknown): string {
		if (error instanceof Error) {
			return error.message;
		}

		return 'Unknown error';
	}
}
