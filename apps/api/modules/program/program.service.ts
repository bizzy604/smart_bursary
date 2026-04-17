/**
 * Purpose: Query and expose available bursary programs to students.
 * Why important: Provides county-scoped program discovery and details lookup.
 * Used by: ProgramController list and read endpoints.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProgramStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ListProgramsDto } from './dto/list-programs.dto';

@Injectable()
export class ProgramService {
	constructor(private readonly prisma: PrismaService) {}

	async listPrograms(countyId: string, dto: ListProgramsDto) {
		const status = this.parseStatus(dto.status);

		return this.prisma.bursaryProgram.findMany({
			where: {
				countyId,
				...(status ? { status } : {}),
				...(dto.academicYear ? { academicYear: dto.academicYear } : {}),
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
						ruleType: true,
						parameters: true,
					},
				},
			},
			orderBy: { opensAt: 'desc' },
		});
	}

	async listActivePrograms(countyId: string, dto: ListProgramsDto) {
		const now = new Date();

		return this.prisma.bursaryProgram.findMany({
			where: {
				countyId,
				status: ProgramStatus.ACTIVE,
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

		if (!program) {
			throw new NotFoundException('Program not found.');
		}

		return program;
	}

	private parseStatus(status?: string): ProgramStatus | undefined {
		if (!status) {
			return undefined;
		}

		const normalized = status.toUpperCase() as ProgramStatus;
		if (!Object.values(ProgramStatus).includes(normalized)) {
			throw new BadRequestException('Invalid status filter.');
		}

		return normalized;
	}

}
