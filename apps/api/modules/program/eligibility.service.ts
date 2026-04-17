/**
 * Purpose: Evaluate student eligibility against program rules.
 * Why important: Enforces profile-driven program visibility and submission constraints.
 * Used by: ProgramService listings and application submission orchestration.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export type ProgramEligibilityResult = {
	eligible: boolean;
	ineligibilityReason: string | null;
};

type ProgramRuleRecord = {
	id: string;
	wardId: string | null;
	eligibilityRules: Array<{
		ruleType: string;
		parameters: Prisma.JsonValue;
	}>;
};

type StudentContext = {
	wardId: string | null;
	educationLevel: string | null;
	annualIncomeKes: number | null;
};

@Injectable()
export class EligibilityService {
	constructor(private readonly prisma: PrismaService) {}

	async evaluateProgramsForStudent<T extends ProgramRuleRecord>(
		countyId: string,
		userId: string,
		programs: T[],
	): Promise<Array<T & ProgramEligibilityResult & { ineligibility_reason: string | null }>> {
		const context = await this.loadStudentContext(countyId, userId);
		return programs.map((program) => {
			const result = this.evaluateWithContext(program, context);
			return { ...program, ...result, ineligibility_reason: result.ineligibilityReason };
		});
	}

	async evaluateProgramById(
		countyId: string,
		userId: string,
		programId: string,
	): Promise<ProgramEligibilityResult> {
		const program = await this.prisma.bursaryProgram.findFirst({
			where: { id: programId, countyId },
			select: {
				id: true,
				wardId: true,
				eligibilityRules: {
					select: { ruleType: true, parameters: true },
				},
			},
		});

		if (!program) throw new NotFoundException('Program not found.');

		const context = await this.loadStudentContext(countyId, userId);
		return this.evaluateWithContext(program, context);
	}

	private async loadStudentContext(countyId: string, userId: string): Promise<StudentContext> {
		const student = await this.prisma.user.findFirst({
			where: { id: userId, countyId, role: UserRole.STUDENT },
			select: {
				wardId: true,
				academicInfo: { select: { institutionType: true } },
				familyInfo: {
					select: {
						fatherIncomeKes: true,
						motherIncomeKes: true,
						guardianIncomeKes: true,
					},
				},
			},
		});

		if (!student) {
			throw new NotFoundException('Student not found.');
		}

		const incomes = [
			student.familyInfo?.fatherIncomeKes,
			student.familyInfo?.motherIncomeKes,
			student.familyInfo?.guardianIncomeKes,
		].filter((value): value is number => value !== null && value !== undefined);

		return {
			wardId: student.wardId,
			educationLevel: this.normalizeEducationLevel(student.academicInfo?.institutionType ?? null),
			annualIncomeKes: incomes.length ? incomes.reduce((sum, value) => sum + value, 0) : null,
		};
	}

	private evaluateWithContext(
		program: ProgramRuleRecord,
		context: StudentContext,
	): ProgramEligibilityResult {
		if (program.wardId && context.wardId && context.wardId !== program.wardId) {
			return {
				eligible: false,
				ineligibilityReason: 'Program is restricted to a different ward.',
			};
		}

		for (const rule of program.eligibilityRules) {
			const reason = this.evaluateRule(rule, context);
			if (reason) {
				return { eligible: false, ineligibilityReason: reason };
			}
		}

		return { eligible: true, ineligibilityReason: null };
	}

	private evaluateRule(
		rule: { ruleType: string; parameters: Prisma.JsonValue },
		context: StudentContext,
	): string | null {
		switch (rule.ruleType.toUpperCase()) {
			case 'EDUCATION_LEVEL': {
				const allowed = this.readAllowedEducationLevels(rule.parameters);
				if (!allowed.length) {
					return null;
				}
				if (!context.educationLevel) {
					return 'Education profile details are required for this program.';
				}
				return allowed.includes(context.educationLevel)
					? null
					: 'Program does not accept your education level.';
			}
			case 'INCOME_BRACKET': {
				const maxIncomeKes = this.readNumericField(rule.parameters, 'max_annual_income_kes');
				if (maxIncomeKes === null) {
					return null;
				}
				if (context.annualIncomeKes === null) {
					return 'Family income details are required for this program.';
				}
				return context.annualIncomeKes <= maxIncomeKes
					? null
					: 'Household income exceeds the allowed bracket.';
			}
			default:
				return null;
		}
	}

	private readAllowedEducationLevels(parameters: Prisma.JsonValue): string[] {
		if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) {
			return [];
		}

		const raw = (parameters as Record<string, unknown>)['allowed'];
		if (!Array.isArray(raw)) {
			return [];
		}

		return raw
			.filter((value): value is string => typeof value === 'string' && value.length > 0)
			.map((value) => value.toUpperCase());
	}

	private readNumericField(parameters: Prisma.JsonValue, field: string): number | null {
		if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) {
			return null;
		}

		const value = (parameters as Record<string, unknown>)[field];
		if (typeof value === 'number' && Number.isFinite(value)) {
			return value;
		}
		if (typeof value === 'string') {
			const parsed = Number(value);
			return Number.isFinite(parsed) ? parsed : null;
		}
		return null;
	}

	private normalizeEducationLevel(value: string | null): string | null {
		if (!value) {
			return null;
		}
		const normalized = value.trim().toUpperCase();
		return normalized.length ? normalized : null;
	}
}
