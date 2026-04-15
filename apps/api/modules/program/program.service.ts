/**
 * Purpose: Query and expose available bursary programs to students.
 * Why important: Student-scoped program discovery with county and program status filtering.
 * Used by: ProgramController endpoints.
 */
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { ListProgramsDto } from './dto/list-programs.dto';

@Injectable()
export class ProgramService {
	constructor(private readonly prisma: PrismaService) {}

	async listActivePrograms(countyId: string, dto: ListProgramsDto) {
		const now = new Date();

		const programs = await this.prisma.bursaryProgram.findMany({
			where: {
				countyId,
				status: 'ACTIVE',
				opensAt: { lte: now },
				closesAt: { gte: now },
				...(dto.academicYear && { academicYear: dto.academicYear }),
			},
			select: {
				id: true,
				name: true,
				description: true,
				budgetCeiling: true,
				allocatedTotal: true,
				opensAt: true,
				closesAt: true,
				academicYear: true,
				eligibilityRules: {
					select: {
						ruleType: true,
						parameters: true,
					},
				},
			},
			orderBy: { opensAt: 'desc' },
		});

		return programs;
	}

	async getProgramById(countyId: string, programId: string) {
		const program = await this.prisma.bursaryProgram.findFirst({
			where: {
				id: programId,
				countyId,
			},
			select: {
				id: true,
				name: true,
				description: true,
				budgetCeiling: true,
				allocatedTotal: true,
				disbursedTotal: true,
				opensAt: true,
				closesAt: true,
				academicYear: true,
				status: true,
				eligibilityRules: {
					select: {
						id: true,
						ruleType: true,
						parameters: true,
					},
				},
			},
		});

		return program;
	}
}
