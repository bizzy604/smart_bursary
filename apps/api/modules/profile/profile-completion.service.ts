/**
 * Purpose: Compute and enforce student profile completion requirements.
 * Why important: Blocks submissions until identity and profile sections meet mandatory readiness checks.
 * Used by: ProfileService and ApplicationSubmissionService.
 */
import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export type ProfileCompletionStatus = {
	personal: boolean;
	academic: boolean;
	family: boolean;
	overallComplete: boolean;
	overall_complete: boolean;
	missingSections: string[];
	missing_sections: string[];
	emailVerified: boolean;
	phoneVerified: boolean;
};

@Injectable()
export class ProfileCompletionService {
	constructor(private readonly prisma: PrismaService) {}

	async getCompletionStatus(countyId: string, userId: string): Promise<ProfileCompletionStatus> {
		const student = await this.prisma.user.findFirst({
			where: { id: userId, countyId, role: UserRole.STUDENT },
			select: {
				emailVerified: true,
				phoneVerified: true,
				profile: { select: { id: true, fullName: true, phone: true, profileComplete: true } },
				academicInfo: { select: { institutionType: true, institutionName: true } },
				familyInfo: { select: { familyStatus: true } },
			},
		});

		if (!student) {
			throw new NotFoundException('Student not found.');
		}

		const personal = this.hasValue(student.profile?.fullName) && this.hasValue(student.profile?.phone);
		const academic = this.hasValue(student.academicInfo?.institutionType) && this.hasValue(student.academicInfo?.institutionName);
		const family = this.hasValue(student.familyInfo?.familyStatus);
		const overallComplete = personal && academic && family;
		const missingSections = [
			...(personal ? [] : ['personal']),
			...(academic ? [] : ['academic']),
			...(family ? [] : ['family']),
		];

		if (student.profile?.id && student.profile.profileComplete !== overallComplete) {
			await this.prisma.studentProfile.update({
				where: { id: student.profile.id },
				data: { profileComplete: overallComplete },
			});
		}

		return {
			personal,
			academic,
			family,
			overallComplete,
			overall_complete: overallComplete,
			missingSections,
			missing_sections: missingSections,
			emailVerified: student.emailVerified,
			phoneVerified: student.phoneVerified,
		};
	}

	async assertSubmissionReady(countyId: string, userId: string): Promise<void> {
		const status = await this.getCompletionStatus(countyId, userId);

		if (!status.emailVerified) {
			throw new UnprocessableEntityException({
				code: 'PROFILE_INCOMPLETE',
				message: 'Verify your email before submitting an application.',
			});
		}

		if (!status.phoneVerified) {
			throw new UnprocessableEntityException({
				code: 'PROFILE_INCOMPLETE',
				message: 'Verify your phone number before submitting an application.',
			});
		}

		if (!status.overallComplete) {
			throw new UnprocessableEntityException({
				code: 'PROFILE_INCOMPLETE',
				message: `Complete your profile sections before submission: ${status.missingSections.join(', ')}.`,
			});
		}
	}

	private hasValue(value?: string | null): boolean {
		return typeof value === 'string' && value.trim().length > 0;
	}
}
