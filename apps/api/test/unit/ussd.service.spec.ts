/**
 * Purpose: Unit tests for the USSD menu pure helpers + happy-path resolver.
 * Why important: Locks the USSD response contract (CON/END prefix, 160-char
 *                truncation, main-menu shape) so future changes don't silently
 *                break Africa's Talking integrations downstream.
 * Used by: Jest unit suite.
 */
import {
	UssdService,
	continueResponse,
	endResponse,
	mainMenu,
} from '../../modules/ussd/ussd.service';

describe('USSD pure helpers', () => {
	it('mainMenu starts with CON and lists the four options', () => {
		const out = mainMenu();
		expect(out.startsWith('CON ')).toBe(true);
		expect(out).toContain('1. Application status');
		expect(out).toContain('2. Allocation amount');
		expect(out).toContain('3. Disbursement');
		expect(out).toContain('4. Help');
	});

	it('continueResponse stays under 160 chars', () => {
		const long = 'x'.repeat(500);
		expect(continueResponse(long).length).toBeLessThanOrEqual(160);
	});

	it('endResponse stays under 160 chars and starts with END', () => {
		const out = endResponse('A'.repeat(500));
		expect(out.length).toBeLessThanOrEqual(160);
		expect(out.startsWith('END ')).toBe(true);
	});
});

describe('UssdService.resolveResponse routing', () => {
	function makeService(prismaOverrides: Record<string, unknown> = {}) {
		const prisma = {
			application: {
				findMany: jest.fn().mockResolvedValue([]),
				findFirst: jest.fn().mockResolvedValue(null),
			},
			disbursementRecord: {
				findFirst: jest.fn().mockResolvedValue(null),
			},
			...prismaOverrides,
		} as any;
		return new UssdService(prisma);
	}

	it('renders the main menu on empty text', async () => {
		const service = makeService();
		const out = await service.resolveResponse({
			sessionId: 's1',
			phoneNumber: '+254700000001',
			text: '',
		});
		expect(out.startsWith('CON ')).toBe(true);
		expect(out).toContain('Smart Bursary');
	});

	it('returns END with no-applications message when phone has no records', async () => {
		const service = makeService();
		const out = await service.resolveResponse({
			sessionId: 's1',
			phoneNumber: '+254700000001',
			text: '1*1',
		});
		expect(out.startsWith('END ')).toBe(true);
		expect(out.toLowerCase()).toContain('no applications');
	});

	it('treats unknown top-level options as invalid', async () => {
		const service = makeService();
		const out = await service.resolveResponse({
			sessionId: 's1',
			phoneNumber: '+254700000001',
			text: '9',
		});
		expect(out.startsWith('END ')).toBe(true);
		expect(out.toLowerCase()).toContain('invalid');
	});

	it('returns the help message under option 4', async () => {
		const service = makeService();
		const out = await service.resolveResponse({
			sessionId: 's1',
			phoneNumber: '+254700000001',
			text: '4',
		});
		expect(out.startsWith('END ')).toBe(true);
		expect(out.toLowerCase()).toContain('county bursary office');
	});
});
