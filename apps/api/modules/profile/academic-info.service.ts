/**
 * Purpose: Manage student academic information updates.
 * Why important: Keeps academic and banking profile data consistent for eligibility and disbursement.
 * Used by: ProfileService academic update flow.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { UpdateAcademicDto } from './dto/update-academic.dto';

@Injectable()
export class AcademicInfoService {
	constructor(private readonly prisma: PrismaService) {}

	async updateAcademic(countyId: string, userId: string, dto: UpdateAcademicDto) {
		await this.ensureStudent(countyId, userId);

		const academic = await this.prisma.academicInfo.upsert({
			where: { userId },
			update: {
				institutionType: dto.institutionType,
				institutionName: dto.institutionName,
				yearFormClass: dto.yearFormClass,
				admissionNumber: dto.admissionNumber,
				courseName: dto.courseName,
				bankAccountName: dto.bankAccountName,
				bankAccountNumber: dto.bankAccountNumber
					? Buffer.from(dto.bankAccountNumber, 'utf8')
					: undefined,
				bankName: dto.bankName,
				bankBranch: dto.bankBranch,
			},
			create: {
				userId,
				countyId,
				institutionType: dto.institutionType,
				institutionName: dto.institutionName,
				yearFormClass: dto.yearFormClass,
				admissionNumber: dto.admissionNumber,
				courseName: dto.courseName,
				bankAccountName: dto.bankAccountName,
				bankAccountNumber: dto.bankAccountNumber
					? Buffer.from(dto.bankAccountNumber, 'utf8')
					: undefined,
				bankName: dto.bankName,
				bankBranch: dto.bankBranch,
			},
			select: {
				institutionType: true,
				institutionName: true,
				yearFormClass: true,
				admissionNumber: true,
				courseName: true,
				bankAccountName: true,
				bankAccountNumber: true,
				bankName: true,
				bankBranch: true,
			},
		});

		return {
			...academic,
			bankAccountNumber: academic.bankAccountNumber
				? Buffer.from(academic.bankAccountNumber).toString('utf8')
				: null,
		};
	}

	private async ensureStudent(countyId: string, userId: string): Promise<void> {
		const student = await this.prisma.user.findFirst({
			where: { id: userId, countyId, role: UserRole.STUDENT },
			select: { id: true },
		});
		if (!student) {
			throw new NotFoundException('Student not found.');
		}
	}
}
