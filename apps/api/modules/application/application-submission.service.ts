/**
 * Purpose: Enforce eligibility and semantic submission errors for application actions.
 * Why important: Keeps application lifecycle semantics aligned with API contract without bloating core workflow service.
 * Used by: ApplicationController draft creation and submit endpoints.
 */
import {
	ConflictException,
	Injectable,
	UnprocessableEntityException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { NotificationLifecycleService } from '../notification/notification-lifecycle.service';
import { ProfileCompletionService } from '../profile/profile-completion.service';
import { EligibilityService } from '../program/eligibility.service';
import { ApplicationAiScoringService } from './application-ai-scoring.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { ApplicationService } from './application.service';

@Injectable()
export class ApplicationSubmissionService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly eligibilityService: EligibilityService,
		private readonly profileCompletionService: ProfileCompletionService,
		private readonly applicationService: ApplicationService,
		private readonly applicationAiScoringService: ApplicationAiScoringService,
		private readonly notificationLifecycleService: NotificationLifecycleService,
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

		await this.applicationAiScoringService.enqueue(
			submitted.id,
			countyId,
			submitted.status,
		);
		await this.notificationLifecycleService.queueStatusChange({
			countyId,
			applicationId: submitted.id,
			eventType: 'APPLICATION_SUBMITTED',
			fromStatus: 'DRAFT',
			toStatus: 'SUBMITTED',
		});

		return submitted;
	}

	private throwIneligible(reason: string): never {
		throw new UnprocessableEntityException({
			code: 'INELIGIBLE',
			message: reason,
		});
	}
}
