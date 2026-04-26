/**
 * Purpose: Orchestrate student profile read and section update workflows.
 * Why important: Centralizes profile API behavior while coordinating section services and completion tracking.
 * Used by: ProfileController endpoints.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { AcademicInfoService } from './academic-info.service';
import { UpdateAcademicDto } from './dto/update-academic.dto';
import { UpdateFamilyDto } from './dto/update-family.dto';
import { UpdatePersonalDto } from './dto/update-personal.dto';
import { FamilyInfoService } from './family-info.service';
import { ProfileCompletionService } from './profile-completion.service';

@Injectable()
export class ProfileService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly academicInfoService: AcademicInfoService,
		private readonly familyInfoService: FamilyInfoService,
		private readonly completionService: ProfileCompletionService,
	) {}

	async getProfile(countyId: string, userId: string) {
		await this.ensureStudent(countyId, userId);

		const [profile, academic, family] = await Promise.all([
			this.prisma.studentProfile.findUnique({ where: { userId } }),
			this.prisma.academicInfo.findUnique({ where: { userId } }),
			this.prisma.familyFinancialInfo.findUnique({ where: { userId } }),
		]);

		return {
			personal: {
				fullName: profile?.fullName ?? null,
				nationalId: profile?.nationalId
					? Buffer.from(profile.nationalId).toString('utf8')
					: null,
				dateOfBirth: profile?.dateOfBirth ?? null,
				gender: profile?.gender ?? null,
				homeWard: profile?.homeWard ?? null,
				villageUnit: profile?.villageUnitName ?? null,
				phone: profile?.phone ?? null,
				profileComplete: profile?.profileComplete ?? false,
			},
			academic: {
				institutionType: academic?.institutionType ?? null,
				institutionName: academic?.institutionName ?? null,
				yearFormClass: academic?.yearFormClass ?? null,
				admissionNumber: academic?.admissionNumber ?? null,
				courseName: academic?.courseName ?? null,
				bankAccountName: academic?.bankAccountName ?? null,
				bankAccountNumber: academic?.bankAccountNumber
					? Buffer.from(academic.bankAccountNumber).toString('utf8')
					: null,
				bankName: academic?.bankName ?? null,
				bankBranch: academic?.bankBranch ?? null,
			},
			family: family
				? {
					familyStatus: family.familyStatus,
					hasDisability: family.hasDisability,
					disabilityDetails: family.disabilityDetails,
					guardianName: family.guardianName,
					guardianOccupation: family.guardianOccupation,
					guardianContact: family.guardianContact,
					numSiblings: family.numSiblings,
					numGuardianChildren: family.numGuardianChildren,
					numSiblingsInSchool: family.numSiblingsInSchool,
					fatherOccupation: family.fatherOccupation,
					fatherIncomeKes: family.fatherIncomeKes,
					motherOccupation: family.motherOccupation,
					motherIncomeKes: family.motherIncomeKes,
					guardianIncomeKes: family.guardianIncomeKes,
					siblingEducationDetails: family.siblingEducationDetails,
					orphanSponsorName: family.orphanSponsorName,
					orphanSponsorRelation: family.orphanSponsorRelation,
					orphanSponsorContact: family.orphanSponsorContact,
				}
				: null,
		};
	}

	async updatePersonal(countyId: string, userId: string, dto: UpdatePersonalDto) {
		const student = await this.ensureStudent(countyId, userId);
		const existing = await this.prisma.studentProfile.findUnique({
			where: { userId },
			select: { fullName: true, phone: true },
		});

		const profile = await this.prisma.studentProfile.upsert({
			where: { userId },
			update: {
				fullName: dto.fullName,
				nationalId: dto.nationalId ? Buffer.from(dto.nationalId, 'utf8') : undefined,
				dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
				gender: dto.gender,
				homeWard: dto.homeWard,
				villageUnitName: dto.villageUnit,
				phone: dto.phone,
			},
			create: {
				userId,
				countyId,
				fullName: dto.fullName ?? existing?.fullName ?? student.email,
				nationalId: dto.nationalId ? Buffer.from(dto.nationalId, 'utf8') : undefined,
				dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
				gender: dto.gender,
				homeWard: dto.homeWard,
				villageUnitName: dto.villageUnit,
				phone: dto.phone ?? existing?.phone,
			},
			select: {
				fullName: true,
				nationalId: true,
				dateOfBirth: true,
				gender: true,
				homeWard: true,
				villageUnitName: true,
				phone: true,
				profileComplete: true,
			},
		});

		await this.completionService.getCompletionStatus(countyId, userId);

		const { villageUnitName, ...rest } = profile;
		return {
			...rest,
			villageUnit: villageUnitName,
			nationalId: profile.nationalId ? Buffer.from(profile.nationalId).toString('utf8') : null,
		};
	}

	async updateAcademic(countyId: string, userId: string, dto: UpdateAcademicDto) {
		const academic = await this.academicInfoService.updateAcademic(countyId, userId, dto);
		await this.completionService.getCompletionStatus(countyId, userId);
		return academic;
	}

	async updateFamily(countyId: string, userId: string, dto: UpdateFamilyDto) {
		const family = await this.familyInfoService.updateFamily(countyId, userId, dto);
		await this.completionService.getCompletionStatus(countyId, userId);
		return family;
	}

	getCompletion(countyId: string, userId: string) {
		return this.completionService.getCompletionStatus(countyId, userId);
	}

	private async ensureStudent(countyId: string, userId: string) {
		const student = await this.prisma.user.findFirst({
			where: { id: userId, countyId, role: UserRole.STUDENT },
			select: { id: true, email: true },
		});
		if (!student) {
			throw new NotFoundException('Student not found.');
		}
		return student;
	}
}
