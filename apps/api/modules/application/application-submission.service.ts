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

import { PrismaService } from '../../database/prisma.service';
import { IdentityKind } from '../identity/dto/identity-claim.types';
import { IdentityRegistryService } from '../identity/services/identity-registry.service';
import { NotificationLifecycleService } from '../notification/notification-lifecycle.service';
import { ProfileCompletionService } from '../profile/profile-completion.service';
import { EligibilityService } from '../program/eligibility.service';
import { ApplicationAiScoringService } from './application-ai-scoring.service';
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
		private readonly applicationAiScoringService: ApplicationAiScoringService,
		private readonly notificationLifecycleService: NotificationLifecycleService,
		private readonly identityRegistryService: IdentityRegistryService,
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

		// Cross-county active-cycle lock (§5.3 L2 of design doc).
		// Claim the identity slot BEFORE the submit so a CONFLICT keeps the application
		// in DRAFT and the student gets a clear 409 they can act on.
		const identityClaimed = await this.claimIdentityForCycle(
			countyId,
			applicantId,
			dto.applicationId,
			draftApplication.programId,
		);

		let submitted;
		try {
			submitted = await this.applicationService.submitApplication(
				countyId,
				applicantId,
				dto,
			);
		} catch (err) {
			// Submit failed AFTER we claimed the identity slot — release it so the student
			// can retry without being self-blocked by their own previous claim.
			if (identityClaimed) {
				await this.identityRegistryService.release(dto.applicationId).catch((releaseErr) => {
					this.logger.error(
						`Failed to release identity slot after submit failure for ${dto.applicationId}: ${(releaseErr as Error).message}`,
					);
				});
			}
			throw err;
		}

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

	/**
	 * Claim the cross-county identity slot for this submission. Returns true if a
	 * claim row was created/refreshed, false if the student has no usable identity
	 * value yet (no national_id and no birth_certificate_number) — in which case we
	 * skip the lock and rely on AI similarity (L6) + village admin attestation (L5)
	 * downstream.
	 *
	 * Throws 409 ConflictException with a structured payload on cross-county collision.
	 */
	private async claimIdentityForCycle(
		countyId: string,
		applicantId: string,
		applicationId: string,
		programId: string,
	): Promise<boolean> {
		const [profile, program] = await Promise.all([
			this.prisma.studentProfile.findUnique({
				where: { userId: applicantId },
				select: { nationalId: true, birthCertificateNumber: true },
			}),
			this.prisma.bursaryProgram.findUnique({
				where: { id: programId },
				select: { academicYear: true },
			}),
		]);

		const rawIdentity = this.extractRawIdentity(profile);
		if (!rawIdentity) {
			this.logger.warn(
				`Application ${applicationId} submitted without a usable identity value; cross-county lock skipped.`,
			);
			return false;
		}

		const cycle = program?.academicYear ?? 'UNSPECIFIED';

		const outcome = await this.identityRegistryService.claim({
			rawIdentity: rawIdentity.value,
			kind: rawIdentity.kind,
			cycle,
			applicationId,
			countyId,
		});

		if (outcome.kind === 'CONFLICT') {
			throw new ConflictException({
				code: 'DUPLICATE_IDENTITY_ACROSS_COUNTIES',
				message:
					'This identity is already locked to another active application in the same intake cycle. ' +
					'Withdraw the existing application before applying again.',
				details: {
					conflictingCountyId: outcome.conflict.conflictingCountyId,
					conflictingApplicationId: outcome.conflict.conflictingApplicationId,
					cycle: outcome.conflict.conflictingCycle,
				},
			});
		}

		return true;
	}

	/**
	 * Pick the highest-priority identity value off the student profile.
	 * Priority order matches §5.3 L2: national_id > birth_certificate_number.
	 * NEMIS UPI is reserved for a future integration when the verification
	 * service starts populating it.
	 */
	private extractRawIdentity(
		profile: {
			nationalId: Uint8Array | null;
			birthCertificateNumber: Uint8Array | null;
		} | null,
	): { value: string; kind: IdentityKind } | null {
		if (!profile) return null;

		if (profile.nationalId && profile.nationalId.length > 0) {
			return {
				value: Buffer.from(profile.nationalId).toString('utf8'),
				kind: IdentityKind.NATIONAL_ID,
			};
		}
		if (profile.birthCertificateNumber && profile.birthCertificateNumber.length > 0) {
			return {
				value: Buffer.from(profile.birthCertificateNumber).toString('utf8'),
				kind: IdentityKind.BIRTH_CERTIFICATE,
			};
		}
		return null;
	}

	private throwIneligible(reason: string): never {
		throw new UnprocessableEntityException({
			code: 'INELIGIBLE',
			message: reason,
		});
	}
}
