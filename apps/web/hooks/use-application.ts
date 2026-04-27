"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
	buildApplicationSectionPayloads,
	createApplicationDraft,
	fetchStudentApplications,
	fetchStudentPrograms,
	saveApplicationSection,
	submitStudentApplication,
} from "@/lib/student-api";
import type { StudentApplicationSummary, StudentProgramSummary } from "@/lib/student-types";
import { useApplicationWizardStore } from "@/store/application-wizard-store";

export function useApplication() {
	const [programs, setPrograms] = useState<StudentProgramSummary[]>([]);
	const [applications, setApplications] = useState<StudentApplicationSummary[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const setApplicationId = useApplicationWizardStore((state) => state.setApplicationId);

	const refresh = useCallback(async () => {
		setIsLoading(true);
		try {
			const [nextPrograms, nextApplications] = await Promise.all([
				fetchStudentPrograms(),
				fetchStudentApplications(),
			]);
			setPrograms(nextPrograms);
			setApplications(nextApplications);
			setError(null);
		} catch (reason: unknown) {
			const message = reason instanceof Error ? reason.message : "Failed to load student application data.";
			setError(message);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const programsById = useMemo(() => {
		return new Map(programs.map((program) => [program.id, program]));
	}, [programs]);

	const applicationsById = useMemo(() => {
		return new Map(applications.map((application) => [application.id, application]));
	}, [applications]);

	const getMergedApplicationById = useCallback(
		(applicationId: string): StudentApplicationSummary | null => {
			return applicationsById.get(applicationId) ?? null;
		},
		[applicationsById],
	);

	const submitDraftApplication = useCallback(
		async (payload: {
			programId: string;
			programName: string;
			requestedKes: number;
			sectionData: Record<string, unknown>;
		}) => {
			const existing = applications.find((item) => item.programId === payload.programId);

			if (existing && existing.status !== "DRAFT") {
				throw new Error("This application is already submitted and cannot be resubmitted.");
			}

			let applicationId = existing?.id;
			if (!applicationId) {
				const draft = await createApplicationDraft(payload.programId);
				applicationId = draft.id;
				setApplicationId(payload.programId, applicationId);
			}

			const sectionPayloads = buildApplicationSectionPayloads(payload.sectionData);
			for (const sectionPayload of sectionPayloads) {
				await saveApplicationSection(applicationId, sectionPayload.sectionKey, sectionPayload.data);
			}

			const submitted = await submitStudentApplication(applicationId);
			await refresh();
			return submitted;
		},
		[applications, refresh, setApplicationId],
	);

	const getApplicationByProgramId = useCallback(
		(programId: string): StudentApplicationSummary | null => {
			const application = applications.find((application) => application.programId === programId) ?? null;
			if (application) {
				setApplicationId(programId, application.id);
			}
			return application;
		},
		[applications, setApplicationId],
	);

	const getProgramById = useCallback(
		(programId: string): StudentProgramSummary | null => {
			return programsById.get(programId) ?? null;
		},
		[programsById],
	);

	return {
		programs,
		applications,
		isLoading,
		error,
		refresh,
		getProgramById,
		getApplicationById: getMergedApplicationById,
		submitDraftApplication,
		getApplicationByProgramId,
	};
}

