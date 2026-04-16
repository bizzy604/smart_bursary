/**
 * Purpose: Validate unit-level application lifecycle rules.
 * Why important: Protects draft creation, section updates, and submission transitions.
 * Used by: Jest unit suite for ApplicationService.
 */
import { BadRequestException } from '@nestjs/common';

import { ApplicationService } from '../../modules/application/application.service';

describe('ApplicationService', () => {
	const prisma = {
		bursaryProgram: { findFirst: jest.fn(), findUnique: jest.fn() },
		user: { findUnique: jest.fn() },
		ward: { findFirst: jest.fn() },
		application: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
		applicationSection: { upsert: jest.fn() },
		applicationTimeline: { create: jest.fn() },
	} as any;

	let service: ApplicationService;

	beforeEach(() => {
		jest.clearAllMocks();
		service = new ApplicationService(prisma);
	});

	it('returns existing application when a duplicate draft is requested', async () => {
		const existing = { id: 'app-1', status: 'DRAFT' };
		prisma.bursaryProgram.findFirst.mockResolvedValue({
			id: 'prog-1',
			closesAt: new Date(Date.now() + 60_000),
			wardId: null,
		});
		prisma.user.findUnique.mockResolvedValue({ wardId: 'ward-1' });
		prisma.application.findFirst.mockResolvedValue(existing);

		const result = await service.createDraft('county-1', 'student-1', { programId: 'prog-1' });

		expect(prisma.application.create).not.toHaveBeenCalled();
		expect(result).toBe(existing);
	});

	it('rejects invalid JSON during section updates', async () => {
		prisma.application.findFirst.mockResolvedValue({ id: 'app-1', programId: 'prog-1' });

		await expect(
			service.updateSection('county-1', 'student-1', 'app-1', {
				sectionKey: 'section_b',
				data: '{invalid-json',
			}),
		).rejects.toBeInstanceOf(BadRequestException);
	});

	it('rejects submission when the program window has already closed', async () => {
		prisma.application.findFirst.mockResolvedValue({ id: 'app-1', programId: 'prog-1' });
		prisma.bursaryProgram.findUnique.mockResolvedValue({ closesAt: new Date(Date.now() - 1_000) });

		await expect(
			service.submitApplication('county-1', 'student-1', { applicationId: 'app-1' }),
		).rejects.toBeInstanceOf(BadRequestException);
	});

	it('submits a draft and records a timeline event', async () => {
		prisma.application.findFirst.mockResolvedValue({ id: 'app-1', programId: 'prog-1' });
		prisma.bursaryProgram.findUnique.mockResolvedValue({ closesAt: new Date(Date.now() + 60_000) });
		prisma.application.update.mockResolvedValue({
			id: 'app-1',
			status: 'SUBMITTED',
			submittedAt: new Date(),
			submissionReference: 'APP-county-123',
		});
		prisma.applicationTimeline.create.mockResolvedValue({});

		const result = await service.submitApplication('county-123456', 'student-1', { applicationId: 'app-1' });

		expect(result.status).toBe('SUBMITTED');
		expect(prisma.applicationTimeline.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					eventType: 'APPLICATION_SUBMITTED',
					fromStatus: 'DRAFT',
					toStatus: 'SUBMITTED',
				}),
			}),
		);
	});
});
