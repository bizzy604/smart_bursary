/**
 * Purpose: Manage student family and financial profile updates.
 * Why important: Supplies reliable family context for scoring, eligibility, and review workflows.
 * Used by: ProfileService family update flow.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { UpdateFamilyDto } from './dto/update-family.dto';

@Injectable()
export class FamilyInfoService {
	constructor(private readonly prisma: PrismaService) {}

	async updateFamily(countyId: string, userId: string, dto: UpdateFamilyDto) {
		await this.ensureStudent(countyId, userId);

		return this.prisma.familyFinancialInfo.upsert({
			where: { userId },
			update: {
				familyStatus: dto.familyStatus,
				hasDisability: dto.hasDisability,
				disabilityDetails: dto.disabilityDetails,
				guardianName: dto.guardianName,
				guardianOccupation: dto.guardianOccupation,
				guardianContact: dto.guardianContact,
				numSiblings: dto.numSiblings,
				numGuardianChildren: dto.numGuardianChildren,
				numSiblingsInSchool: dto.numSiblingsInSchool,
				fatherOccupation: dto.fatherOccupation,
				fatherIncomeKes: dto.fatherIncomeKes,
				motherOccupation: dto.motherOccupation,
				motherIncomeKes: dto.motherIncomeKes,
				guardianIncomeKes: dto.guardianIncomeKes,
				siblingEducationDetails: dto.siblingEducationDetails as Prisma.InputJsonValue,
				orphanSponsorName: dto.orphanSponsorName,
				orphanSponsorRelation: dto.orphanSponsorRelation,
				orphanSponsorContact: dto.orphanSponsorContact,
			},
			create: {
				userId,
				countyId,
				familyStatus: dto.familyStatus,
				hasDisability: dto.hasDisability ?? false,
				disabilityDetails: dto.disabilityDetails,
				guardianName: dto.guardianName,
				guardianOccupation: dto.guardianOccupation,
				guardianContact: dto.guardianContact,
				numSiblings: dto.numSiblings,
				numGuardianChildren: dto.numGuardianChildren,
				numSiblingsInSchool: dto.numSiblingsInSchool,
				fatherOccupation: dto.fatherOccupation,
				fatherIncomeKes: dto.fatherIncomeKes,
				motherOccupation: dto.motherOccupation,
				motherIncomeKes: dto.motherIncomeKes,
				guardianIncomeKes: dto.guardianIncomeKes,
				siblingEducationDetails: (dto.siblingEducationDetails ?? []) as Prisma.InputJsonValue,
				orphanSponsorName: dto.orphanSponsorName,
				orphanSponsorRelation: dto.orphanSponsorRelation,
				orphanSponsorContact: dto.orphanSponsorContact,
			},
			select: {
				familyStatus: true,
				hasDisability: true,
				disabilityDetails: true,
				guardianName: true,
				guardianOccupation: true,
				guardianContact: true,
				numSiblings: true,
				numGuardianChildren: true,
				numSiblingsInSchool: true,
				fatherOccupation: true,
				fatherIncomeKes: true,
				motherOccupation: true,
				motherIncomeKes: true,
				guardianIncomeKes: true,
				siblingEducationDetails: true,
				orphanSponsorName: true,
				orphanSponsorRelation: true,
				orphanSponsorContact: true,
			},
		});
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
