import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { AuthService } from '../../modules/auth/auth.service';

describe('AuthService', () => {
	const prisma = {
		county: { findUnique: jest.fn() },
		user: { create: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
		studentProfile: { create: jest.fn() },
	} as any;

	const authSessionService = {
		createRefreshToken: jest.fn(),
		consumeRefreshToken: jest.fn(),
		revokeRefreshToken: jest.fn(),
		createPhoneOtp: jest.fn(),
		consumePhoneOtp: jest.fn(),
	} as any;

	const authTokenService = {
		createAuthResponse: jest.fn(),
		refreshTtlSeconds: jest.fn().mockReturnValue(604800),
	} as any;

	let service: AuthService;

	beforeEach(() => {
		jest.clearAllMocks();
		service = new AuthService(prisma, authTokenService, authSessionService);
	});

	it('registers a student and returns the auth payload', async () => {
		prisma.county.findUnique.mockResolvedValue({ id: 'county-1' });
		prisma.user.create.mockResolvedValue({
			id: 'user-1',
			email: 'student@example.com',
			role: UserRole.STUDENT,
			countyId: 'county-1',
			wardId: null,
		});
		prisma.studentProfile.create.mockResolvedValue({});
		authSessionService.createRefreshToken.mockResolvedValue('refresh-token');
		authTokenService.createAuthResponse.mockReturnValue({
			accessToken: 'access-token',
			refreshToken: 'refresh-token',
			user: {
				id: 'user-1',
				email: 'student@example.com',
				role: UserRole.STUDENT,
				countyId: 'county-1',
				wardId: null,
			},
			emailVerificationToken: 'verify-token',
		});

		const response = await service.register({
			email: 'Student@Example.com',
			password: 'StrongPass123!',
			countySlug: 'turkana',
			fullName: 'Test Student',
			phone: '+254700000001',
		});

		expect(prisma.user.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					email: 'student@example.com',
					role: UserRole.STUDENT,
				}),
			}),
		);
		expect(authSessionService.createRefreshToken).toHaveBeenCalledWith(
			expect.objectContaining({ userId: 'user-1' }),
			604800,
		);
		expect(response).toEqual(expect.objectContaining({ accessToken: 'access-token', refreshToken: 'refresh-token' }));
	});

	it('rotates refresh tokens when refreshing a session', async () => {
		authSessionService.consumeRefreshToken.mockResolvedValue({
			userId: 'user-1',
			email: 'student@example.com',
			role: UserRole.STUDENT,
			countyId: 'county-1',
			wardId: null,
		});
		authSessionService.revokeRefreshToken.mockResolvedValue(undefined);
		authSessionService.createRefreshToken.mockResolvedValue('new-refresh-token');
		authTokenService.createAuthResponse.mockReturnValue({
			accessToken: 'new-access-token',
			refreshToken: 'new-refresh-token',
			user: {
				id: 'user-1',
				email: 'student@example.com',
				role: UserRole.STUDENT,
				countyId: 'county-1',
				wardId: null,
			},
		});

		const response = await service.refreshSession('refresh-token');

		// consumeRefreshToken atomically reads and deletes the token (Redis GETDEL),
		// so a separate revokeRefreshToken call is not required.
		expect(authSessionService.consumeRefreshToken).toHaveBeenCalledWith('refresh-token');
		expect(authSessionService.createRefreshToken).toHaveBeenCalledWith(
			expect.objectContaining({ userId: 'user-1' }),
			604800,
		);
		expect(response.accessToken).toBe('new-access-token');
	});

	it('rejects refreshes with invalid tokens', async () => {
		authSessionService.consumeRefreshToken.mockResolvedValue(null);

		await expect(service.refreshSession('invalid')).rejects.toBeInstanceOf(UnauthorizedException);
	});

	it('rejects registration for unknown counties', async () => {
		prisma.county.findUnique.mockResolvedValue(null);

		await expect(
			service.register({
				email: 'student@example.com',
				password: 'StrongPass123!',
				countySlug: 'missing',
				fullName: 'Test Student',
				phone: '+254700000001',
			}),
		).rejects.toBeInstanceOf(BadRequestException);
	});
});