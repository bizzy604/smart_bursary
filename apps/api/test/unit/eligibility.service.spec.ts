/**
 * Purpose: Validate student-facing program eligibility listing behavior.
 * Why important: Ensures active-program filtering remains county and window scoped.
 * Used by: Jest unit suite for program listing and lookup logic.
 */
import { ProgramService } from '../../modules/program/program.service';

describe('ProgramService eligibility/listing behavior', () => {
	const prisma = {
		bursaryProgram: {
			findMany: jest.fn(),
			findFirst: jest.fn(),
		},
	} as any;

	let service: ProgramService;

	beforeEach(() => {
		jest.clearAllMocks();
		service = new ProgramService(prisma);
	});

	it('lists only active programs in the current application window', async () => {
		prisma.bursaryProgram.findMany.mockResolvedValue([{ id: 'prog-1', name: 'County Bursary' }]);

		const result = await service.listActivePrograms('county-1', { academicYear: '2026' });

		expect(prisma.bursaryProgram.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					countyId: 'county-1',
					status: 'ACTIVE',
					academicYear: '2026',
					opensAt: expect.any(Object),
					closesAt: expect.any(Object),
				}),
			}),
		);
		expect(result).toEqual([{ id: 'prog-1', name: 'County Bursary' }]);
	});

	it('omits academic year filter when not provided', async () => {
		prisma.bursaryProgram.findMany.mockResolvedValue([]);

		await service.listActivePrograms('county-1', {});

		const callArg = prisma.bursaryProgram.findMany.mock.calls[0][0];
		expect(callArg.where.academicYear).toBeUndefined();
	});

	it('returns null when program id is not found in county scope', async () => {
		prisma.bursaryProgram.findFirst.mockResolvedValue(null);

		const result = await service.getProgramById('county-1', 'missing-program');

		expect(result).toBeNull();
	});
});
