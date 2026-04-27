/**
 * Purpose: Implement late-stage application lifecycle transitions (withdraw and
 *          delete-draft) including cross-cutting concerns such as releasing the
 *          identity-registry slot.
 * Why important: Splitting these out of ApplicationService keeps that file
 *                under the 200-line limit and ensures withdraws actually free
 *                the cross-county identity lock so the student can re-apply.
 * Used by: ApplicationController for /applications/:id/withdraw and
 *          /applications/:id/draft (DELETE).
 */
import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { IdentityRegistryService } from '../identity/services/identity-registry.service';

const WITHDRAWABLE_STATUSES = [
	'SUBMITTED',
	'WARD_REVIEW',
	'WARD_DISTRIBUTION_PENDING',
	'VILLAGE_ALLOCATION_PENDING',
	'COUNTY_REVIEW',
	'WAITLISTED',
] as const;

@Injectable()
export class ApplicationLifecycleService {
	private readonly logger = new Logger(ApplicationLifecycleService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly identityRegistryService: IdentityRegistryService,
	) {}

	async withdrawApplication(
		countyId: string,
		applicantId: string,
		applicationId: string,
	) {
		const application = await this.prisma.application.findFirst({
			where: { id: applicationId, countyId, applicantId, deletedAt: null },
			select: { id: true, status: true },
		});

		if (!application) {
			throw new NotFoundException('Application not found.');
		}

		if (application.status === 'DRAFT') {
			throw new BadRequestException(
				'Drafts cannot be withdrawn. Use delete draft instead.',
			);
		}

		if (!WITHDRAWABLE_STATUSES.includes(application.status as never)) {
			throw new BadRequestException(
				`Applications in status ${application.status} cannot be withdrawn.`,
			);
		}

		const fromStatus = application.status;

		const updated = await this.prisma.application.update({
			where: { id: applicationId },
			data: { status: 'WITHDRAWN' },
			select: { id: true, status: true },
		});

		// Free the cross-county identity slot so the student can legitimately
		// apply elsewhere in the same cycle. Failures here must not block the
		// withdrawal — the application is already marked WITHDRAWN — so we log
		// and continue.
		try {
			await this.identityRegistryService.release(applicationId);
		} catch (error) {
			this.logger.error(
				`Failed to release identity registry slot for withdrawn application ${applicationId}`,
				error instanceof Error ? error.stack : String(error),
			);
		}

		await this.prisma.applicationTimeline.create({
			data: {
				applicationId,
				countyId,
				actorId: applicantId,
				eventType: 'APPLICATION_WITHDRAWN',
				fromStatus,
				toStatus: 'WITHDRAWN',
			},
		});

		return updated;
	}

	async deleteDraftApplication(
		countyId: string,
		applicantId: string,
		applicationId: string,
	) {
		const application = await this.prisma.application.findFirst({
			where: { id: applicationId, countyId, applicantId, deletedAt: null },
			select: { id: true, status: true },
		});

		if (!application) {
			throw new NotFoundException('Application not found.');
		}

		if (application.status !== 'DRAFT') {
			throw new BadRequestException(
				'Only draft applications can be deleted. Use withdraw to cancel a submitted application.',
			);
		}

		// Hard-delete drafts: the @@unique([applicantId, programId]) constraint on
		// applications is unconditional, so a soft-deleted row would permanently
		// block the student from re-applying to the same program. Sections cascade
		// via onDelete: Cascade. Timeline rows reference applicationId without a
		// FK cascade, so we clear them explicitly to avoid orphans.
		await this.prisma.$transaction([
			this.prisma.applicationTimeline.deleteMany({ where: { applicationId } }),
			this.prisma.application.delete({ where: { id: applicationId } }),
		]);

		return { id: applicationId, deleted: true };
	}
}
