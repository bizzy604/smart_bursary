/**
 * Purpose: Orchestrate student application lifecycle workflows and state transitions.
 * Why important: Centralizes all application creation, section updates, and submission logic away from controllers.
 * Used by: ApplicationController endpoints.
 */
import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { UpdateApplicationSectionDto } from './dto/update-application-section.dto';

@Injectable()
export class ApplicationService {
	constructor(private readonly prisma: PrismaService) {}

	async createDraft(
		countyId: string,
		applicantId: string,
		dto: CreateApplicationDto,
	) {
		const program = await this.prisma.bursaryProgram.findFirst({
			where: {
				id: dto.programId,
				countyId,
				status: 'ACTIVE',
			},
			select: {
				id: true,
				closesAt: true,
				wardId: true,
			},
		});

		if (!program) {
			throw new BadRequestException('Program not found or no longer active.');
		}

		if (program.closesAt < new Date()) {
			throw new BadRequestException('Program application window has closed.');
		}

		const applicant = await this.prisma.user.findUnique({
			where: { id: applicantId },
			select: { wardId: true },
		});

		if (!applicant) {
			throw new NotFoundException('Applicant not found.');
		}

		let wardId = applicant.wardId;
		if (!wardId) {
			const ward = await this.prisma.ward.findFirst({
				where: { countyId },
				select: { id: true },
			});
			if (!ward) {
				throw new BadRequestException('No ward found for your county. Please contact support.');
			}
			wardId = ward.id;
		}

		const existingApp = await this.prisma.application.findFirst({
			where: {
				applicantId,
				programId: dto.programId,
			},
		});

		if (existingApp) {
			return existingApp;
		}

		const application = await this.prisma.application.create({
			data: {
				countyId,
				applicantId,
				programId: dto.programId,
				wardId,
				status: 'DRAFT',
			},
			select: {
				id: true,
				status: true,
				createdAt: true,
			},
		});

		await this.recordTimeline(countyId, application.id, applicantId, 'APPLICATION_CREATED', 'DRAFT', 'DRAFT');

		return application;
	}

	async listMyApplications(countyId: string, applicantId: string) {
		const applications = await this.prisma.application.findMany({
			where: {
				countyId,
				applicantId,
				deletedAt: null,
			},
			select: {
				id: true,
				status: true,
				programId: true,
				submittedAt: true,
				createdAt: true,
				updatedAt: true,
				program: {
					select: {
						id: true,
						name: true,
						academicYear: true,
					},
				},
			},
			orderBy: { createdAt: 'desc' },
		});

		return applications;
	}

	async getApplication(countyId: string, applicantId: string, applicationId: string) {
		const application = await this.prisma.application.findFirst({
			where: {
				id: applicationId,
				countyId,
				applicantId,
				deletedAt: null,
			},
			select: {
				id: true,
				status: true,
				programId: true,
				totalFeeKes: true,
				outstandingBalance: true,
				amountRequested: true,
				reason: true,
				createdAt: true,
				updatedAt: true,
				submittedAt: true,
				sections: {
					select: {
						sectionKey: true,
						data: true,
						isComplete: true,
						savedAt: true,
					},
				},
				program: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		});

		if (!application) {
			throw new NotFoundException('Application not found.');
		}

		return application;
	}

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
			select: {
				id: true,
				programId: true,
			},
		});

		if (!application) {
			throw new BadRequestException('Application not found or no longer in draft state.');
		}

		let parsedData: unknown;
		try {
			parsedData = JSON.parse(dto.data);
		} catch {
			throw new BadRequestException('Invalid JSON in section data.');
		}

		const section = await this.prisma.applicationSection.upsert({
			where: {
				applicationId_sectionKey: {
					applicationId,
					sectionKey: dto.sectionKey,
				},
			},
			update: {
				data: parsedData as never,
				savedAt: new Date(),
			},
			create: {
				applicationId,
				countyId,
				sectionKey: dto.sectionKey,
				data: parsedData as never,
			},
			select: {
				sectionKey: true,
				data: true,
				isComplete: true,
				savedAt: true,
			},
		});

		return section;
	}

	async submitApplication(
		countyId: string,
		applicantId: string,
		dto: SubmitApplicationDto,
	) {
		const application = await this.prisma.application.findFirst({
			where: {
				id: dto.applicationId,
				countyId,
				applicantId,
				status: 'DRAFT',
			},
			select: {
				id: true,
				programId: true,
			},
		});

		if (!application) {
			throw new BadRequestException('Application not found or already submitted.');
		}

		const program = await this.prisma.bursaryProgram.findUnique({
			where: { id: application.programId },
			select: { closesAt: true },
		});

		if (!program || program.closesAt < new Date()) {
			throw new BadRequestException('Program submission window has closed.');
		}

		const now = new Date();
		const submissionRef = `APP-${countyId.substring(0, 6)}-${Date.now()}`;

		const submitted = await this.prisma.application.update({
			where: { id: dto.applicationId },
			data: {
				status: 'SUBMITTED',
				submittedAt: now,
				submissionReference: submissionRef,
			},
			select: {
				id: true,
				status: true,
				submittedAt: true,
				submissionReference: true,
			},
		});

		await this.recordTimeline(
			countyId,
			dto.applicationId,
			applicantId,
			'APPLICATION_SUBMITTED',
			'DRAFT',
			'SUBMITTED',
		);

		return submitted;
	}

	async withdrawApplication(
		countyId: string,
		applicantId: string,
		applicationId: string,
	) {
		const application = await this.prisma.application.findFirst({
			where: {
				id: applicationId,
				countyId,
				applicantId,
				deletedAt: null,
			},
			select: { id: true, status: true },
		});

		if (!application) {
			throw new NotFoundException('Application not found.');
		}

		const withdrawableStatuses: Array<typeof application.status> = [
			'SUBMITTED',
			'WARD_REVIEW',
			'WARD_DISTRIBUTION_PENDING',
			'VILLAGE_ALLOCATION_PENDING',
			'COUNTY_REVIEW',
			'WAITLISTED',
		];

		if (application.status === 'DRAFT') {
			throw new BadRequestException(
				'Drafts cannot be withdrawn. Use delete draft instead.',
			);
		}

		if (!withdrawableStatuses.includes(application.status)) {
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

		await this.recordTimeline(
			countyId,
			applicationId,
			applicantId,
			'APPLICATION_WITHDRAWN',
			fromStatus,
			'WITHDRAWN',
		);

		return updated;
	}

	async deleteDraftApplication(
		countyId: string,
		applicantId: string,
		applicationId: string,
	) {
		const application = await this.prisma.application.findFirst({
			where: {
				id: applicationId,
				countyId,
				applicantId,
				deletedAt: null,
			},
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

		await this.prisma.application.update({
			where: { id: applicationId },
			data: { deletedAt: new Date() },
		});

		return { id: applicationId, deleted: true };
	}

	private async recordTimeline(
		countyId: string,
		applicationId: string,
		actorId: string,
		eventType: string,
		fromStatus: string,
		toStatus: string,
	) {
		await this.prisma.applicationTimeline.create({
			data: {
				applicationId,
				countyId,
				actorId,
				eventType,
				fromStatus,
				toStatus,
			},
		});
	}
}
