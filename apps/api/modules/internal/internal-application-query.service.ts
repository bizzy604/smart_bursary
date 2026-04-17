/**
 * Purpose: Build normalized application payloads for AI scoring service consumption.
 * Why important: Gives the AI runtime a stable data contract independent of UI section formats.
 * Used by: InternalController internal application fetch endpoint.
 */
import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import {
	extractYear,
	normalizeFamilyStatus,
	parseYear,
	toBoolean,
	toNumber,
	toRecord,
	toText,
} from './internal-application-query.helpers';

@Injectable()
export class InternalApplicationQueryService {
	constructor(private readonly prisma: PrismaService) {}

	async getScoringPayload(applicationId: string) {
		const application = await this.prisma.application.findUnique({
			where: { id: applicationId },
			select: {
				id: true,
				countyId: true,
				programId: true,
				helbApplied: true,
				priorBursaryReceived: true,
				priorBursarySource: true,
				program: {
					select: {
						academicYear: true,
					},
				},
				applicant: {
					select: {
						academicInfo: {
							select: {
								institutionType: true,
								yearFormClass: true,
							},
						},
						familyInfo: {
							select: {
								familyStatus: true,
								hasDisability: true,
								numSiblingsInSchool: true,
								fatherOccupation: true,
								motherOccupation: true,
								fatherIncomeKes: true,
								motherIncomeKes: true,
								guardianIncomeKes: true,
							},
						},
					},
				},
				sections: {
					select: {
						sectionKey: true,
						data: true,
					},
				},
				documents: {
					select: {
						docType: true,
						s3Key: true,
						originalName: true,
						contentType: true,
						fileSizeBytes: true,
						uploadedAt: true,
					},
				},
			},
		});

		if (!application) {
			throw new NotFoundException('Application not found for internal scoring fetch.');
		}

		const sectionMap = new Map(
			application.sections.map((section) => [
				section.sectionKey,
				toRecord(section.data),
			]),
		);
		const sectionA = sectionMap.get('section-a') ?? {};
		const sectionB = sectionMap.get('section-b') ?? {};
		const sectionC = sectionMap.get('section-c') ?? {};
		const sectionD = sectionMap.get('section-d') ?? {};
		const sectionDIncome = toRecord(sectionD.income);
		const sectionE = sectionMap.get('section-e') ?? {};
		const familyInfo = application.applicant.familyInfo;

		const documents: Record<string, string> = {};
		const documentMetadata: Record<string, Record<string, unknown>> = {};

		for (const document of application.documents) {
			documents[document.docType] = document.s3Key;
			documentMetadata[document.docType] = {
				original_name: document.originalName,
				content_type: document.contentType,
				file_size_bytes: document.fileSizeBytes,
				uploaded_at: document.uploadedAt.toISOString(),
				...(extractYear(document.originalName) !== null
					? { year: extractYear(document.originalName) }
					: {}),
			};
		}

		const hasDisability =
			toBoolean(sectionE.hasDisabilityNeeds) ||
			toBoolean(familyInfo?.hasDisability) ||
			toText(sectionC.familyStatus) === 'PERSON_WITH_DISABILITY';
		const familyStatus = normalizeFamilyStatus(
			toText(sectionC.familyStatus) ?? familyInfo?.familyStatus ?? 'BOTH_PARENTS',
		);

		return {
			data: {
				application_id: application.id,
				county_id: application.countyId,
				program_id: application.programId,
				family_status: familyStatus,
				father_income_kes: toNumber(
					sectionDIncome.fatherMonthlyIncomeKes,
					familyInfo?.fatherIncomeKes,
				),
				mother_income_kes: toNumber(
					sectionDIncome.motherMonthlyIncomeKes,
					familyInfo?.motherIncomeKes,
				),
				guardian_income_kes: toNumber(
					sectionDIncome.guardianMonthlyIncomeKes,
					familyInfo?.guardianIncomeKes,
				),
				has_disability: hasDisability,
				parent_has_disability: false,
				num_siblings_in_school: toNumber(
					sectionC.dependantsInSchool,
					familyInfo?.numSiblingsInSchool,
				),
				prior_bursary_received: toBoolean(
					sectionB.priorBursaryReceived,
					application.priorBursaryReceived,
				),
				prior_bursary_source:
					toText(sectionB.priorBursarySource) ?? application.priorBursarySource,
				father_occupation:
					toText(sectionDIncome.fatherOccupation) ?? familyInfo?.fatherOccupation,
				mother_occupation:
					toText(sectionDIncome.motherOccupation) ?? familyInfo?.motherOccupation,
				national_id: toText(sectionA.nationalIdOrBirthCert),
				program_year: parseYear(application.program?.academicYear),
				documents,
				document_metadata: documentMetadata,
				institution_type: application.applicant.academicInfo?.institutionType,
				year_of_study: parseYear(
					toText(sectionA.yearOfStudy) ??
						application.applicant.academicInfo?.yearFormClass,
				),
				hel_b_applied: toBoolean(sectionB.helbApplied, application.helbApplied),
			},
		};
	}
}
