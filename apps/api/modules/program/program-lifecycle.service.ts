/**
 * Purpose: Handle county-admin program lifecycle operations.
 * Why important: Encapsulates create, update, publish, and close invariants for bursary programs.
 * Used by: ProgramController management endpoints.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProgramStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { ProgramService } from './program.service';

@Injectable()
export class ProgramLifecycleService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly programService: ProgramService,
	) {}

	async createProgram(countyId: string, createdBy: string, dto: CreateProgramDto) {
		const opensAt = this.parseDateOrThrow(dto.opensAt, 'opensAt');
		const closesAt = this.parseDateOrThrow(dto.closesAt, 'closesAt');
		this.assertWindow(opensAt, closesAt);

		if (dto.wardId) {
			await this.ensureWardBelongsToCounty(countyId, dto.wardId);
		}

		const created = await this.prisma.$transaction(async (tx) => {
			const program = await tx.bursaryProgram.create({
				data: {
					countyId,
					createdBy,
					name: dto.name,
					description: dto.description,
					wardId: dto.wardId,
					budgetCeiling: dto.budgetCeiling,
					opensAt,
					closesAt,
					academicYear: dto.academicYear,
					status: ProgramStatus.DRAFT,
				},
				select: { id: true },
			});

			if (dto.eligibilityRules?.length) {
				await tx.eligibilityRule.createMany({
					data: dto.eligibilityRules.map((rule) => ({
						programId: program.id,
						countyId,
						ruleType: rule.ruleType,
						parameters: rule.parameters as Prisma.InputJsonValue,
					})),
				});
			}

			return program;
		});

		return this.programService.getProgramById(countyId, created.id);
	}

	async updateProgram(countyId: string, programId: string, dto: UpdateProgramDto) {
		const existing = await this.requireProgram(countyId, programId);
		if (existing.status !== ProgramStatus.DRAFT) {
			throw new BadRequestException('Only DRAFT programs can be updated.');
		}

		const opensAt = dto.opensAt
			? this.parseDateOrThrow(dto.opensAt, 'opensAt')
			: existing.opensAt;
		const closesAt = dto.closesAt
			? this.parseDateOrThrow(dto.closesAt, 'closesAt')
			: existing.closesAt;
		this.assertWindow(opensAt, closesAt);

		if (dto.wardId) {
			await this.ensureWardBelongsToCounty(countyId, dto.wardId);
		}

		await this.prisma.$transaction(async (tx) => {
			await tx.bursaryProgram.update({
				where: { id: programId },
				data: {
					name: dto.name,
					description: dto.description,
					wardId: dto.wardId,
					budgetCeiling: dto.budgetCeiling,
					opensAt,
					closesAt,
					academicYear: dto.academicYear,
				},
			});

			if (dto.eligibilityRules) {
				await tx.eligibilityRule.deleteMany({ where: { programId, countyId } });
				if (dto.eligibilityRules.length) {
					await tx.eligibilityRule.createMany({
						data: dto.eligibilityRules.map((rule) => ({
							programId,
							countyId,
							ruleType: rule.ruleType,
							parameters: rule.parameters as Prisma.InputJsonValue,
						})),
					});
				}
			}
		});

		return this.programService.getProgramById(countyId, programId);
	}

	async publishProgram(countyId: string, programId: string) {
		const existing = await this.requireProgram(countyId, programId);
		if (existing.status !== ProgramStatus.DRAFT) {
			throw new BadRequestException('Only DRAFT programs can be published.');
		}

		this.assertWindow(existing.opensAt, existing.closesAt);

		return this.prisma.bursaryProgram.update({
			where: { id: programId },
			data: { status: ProgramStatus.ACTIVE },
			select: { id: true, status: true },
		});
	}

	async closeProgram(countyId: string, programId: string) {
		const existing = await this.requireProgram(countyId, programId);
		if (existing.status !== ProgramStatus.ACTIVE) {
			throw new BadRequestException('Only ACTIVE programs can be closed.');
		}

		const now = new Date();
		const closesAt = existing.closesAt > now ? now : existing.closesAt;

		return this.prisma.bursaryProgram.update({
			where: { id: programId },
			data: {
				status: ProgramStatus.CLOSED,
				closesAt,
			},
			select: { id: true, status: true, closesAt: true },
		});
	}

	async archiveProgram(countyId: string, programId: string) {
		const existing = await this.requireProgram(countyId, programId);
		if (existing.status === ProgramStatus.ARCHIVED) {
			return { id: existing.id, status: existing.status };
		}

		return this.prisma.bursaryProgram.update({
			where: { id: programId },
			data: { status: ProgramStatus.ARCHIVED },
			select: { id: true, status: true },
		});
	}

	async unarchiveProgram(countyId: string, programId: string) {
		const existing = await this.requireProgram(countyId, programId);
		if (existing.status !== ProgramStatus.ARCHIVED) {
			throw new BadRequestException('Only ARCHIVED programs can be unarchived.');
		}

		return this.prisma.bursaryProgram.update({
			where: { id: programId },
			data: { status: ProgramStatus.DRAFT },
			select: { id: true, status: true },
		});
	}

	async deleteProgram(countyId: string, programId: string) {
		const existing = await this.requireProgram(countyId, programId);

		await this.prisma.bursaryProgram.update({
			where: { id: existing.id },
			data: { deletedAt: new Date(), status: ProgramStatus.ARCHIVED },
		});

		return { id: existing.id, deleted: true };
	}

	private parseDateOrThrow(value: string, field: string): Date {
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) {
			throw new BadRequestException(`${field} must be a valid ISO date.`);
		}
		return date;
	}

	private assertWindow(opensAt: Date, closesAt: Date): void {
		if (closesAt <= opensAt) {
			throw new BadRequestException('closesAt must be later than opensAt.');
		}
	}

	private async ensureWardBelongsToCounty(countyId: string, wardId: string): Promise<void> {
		const ward = await this.prisma.ward.findFirst({
			where: { id: wardId, countyId },
			select: { id: true },
		});
		if (!ward) {
			throw new BadRequestException('Ward does not belong to this county.');
		}
	}

	private async requireProgram(countyId: string, programId: string) {
		const program = await this.prisma.bursaryProgram.findFirst({
			where: { id: programId, countyId, deletedAt: null },
			select: { id: true, status: true, opensAt: true, closesAt: true },
		});
		if (!program) {
			throw new NotFoundException('Program not found.');
		}
		return program;
	}
}
