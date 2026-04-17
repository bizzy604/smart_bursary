/**
 * Purpose: Provide role-aware timeline and review-note audit queries for applications.
 * Why important: Makes workflow history and reviewer notes visible without exposing cross-tenant data.
 * Used by: ApplicationController audit endpoints.
 */
import {
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

type AuditActor = {
	userId: string;
	role: UserRole;
	wardId: string | null;
};

type ScopedApplication = {
	id: string;
	applicantId: string;
	wardId: string;
};

@Injectable()
export class ApplicationAuditService {
	constructor(private readonly prisma: PrismaService) {}

	async getTimeline(countyId: string, applicationId: string, actor: AuditActor) {
		const application = await this.getScopedApplication(countyId, applicationId);
		this.assertAuditAccess(application, actor);

		const rows = await this.prisma.applicationTimeline.findMany({
			where: { countyId, applicationId },
			orderBy: { occurredAt: 'asc' },
			select: {
				id: true,
				eventType: true,
				fromStatus: true,
				toStatus: true,
				metadata: true,
				occurredAt: true,
				actor: {
					select: {
						id: true,
						email: true,
						role: true,
						profile: { select: { fullName: true } },
					},
				},
			},
		});

		return {
			data: rows.map((row) => ({
				id: row.id,
				eventType: row.eventType,
				fromStatus: row.fromStatus,
				toStatus: row.toStatus,
				metadata: row.metadata,
				occurredAt: row.occurredAt,
				actor: row.actor
					? {
						id: row.actor.id,
						email: row.actor.email,
						role: row.actor.role,
						fullName: row.actor.profile?.fullName ?? null,
					}
					: null,
			})),
		};
	}

	async getReviewNotes(countyId: string, applicationId: string, actor: AuditActor) {
		const application = await this.getScopedApplication(countyId, applicationId);
		this.assertAuditAccess(application, actor);

		const rows = await this.prisma.applicationReview.findMany({
			where: {
				countyId,
				applicationId,
				note: { not: null },
			},
			orderBy: { reviewedAt: 'asc' },
			select: {
				id: true,
				stage: true,
				decision: true,
				note: true,
				recommendedAmount: true,
				allocatedAmount: true,
				reviewedAt: true,
				reviewer: {
					select: {
						id: true,
						email: true,
						role: true,
						profile: { select: { fullName: true } },
					},
				},
			},
		});

		return {
			data: rows.map((row) => ({
				reviewId: row.id,
				stage: row.stage,
				decision: row.decision,
				note: row.note,
				recommendedAmount:
					row.recommendedAmount === null ? null : Number(row.recommendedAmount),
				allocatedAmount:
					row.allocatedAmount === null ? null : Number(row.allocatedAmount),
				reviewedAt: row.reviewedAt,
				reviewer: {
					id: row.reviewer.id,
					email: row.reviewer.email,
					role: row.reviewer.role,
					fullName: row.reviewer.profile?.fullName ?? null,
				},
			})),
		};
	}

	private async getScopedApplication(countyId: string, applicationId: string) {
		const application = await this.prisma.application.findFirst({
			where: { id: applicationId, countyId },
			select: { id: true, applicantId: true, wardId: true },
		});

		if (!application) {
			throw new NotFoundException('Application not found.');
		}

		return application as ScopedApplication;
	}

	private assertAuditAccess(application: ScopedApplication, actor: AuditActor) {
		if (actor.role === UserRole.STUDENT) {
			if (actor.userId !== application.applicantId) {
				throw new ForbiddenException('Students can only access their own applications.');
			}
			return;
		}

		if (actor.role === UserRole.WARD_ADMIN) {
			if (!actor.wardId || actor.wardId !== application.wardId) {
				throw new ForbiddenException('Ward admins can only access applications in their ward.');
			}
			return;
		}

		if (actor.role === UserRole.FINANCE_OFFICER || actor.role === UserRole.COUNTY_ADMIN) {
			return;
		}

		throw new ForbiddenException('Role is not allowed to access application audit data.');
	}
}
