"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
	applications,
	getProgramById,
	getTimelineForApplication,
	programs,
	type StudentApplicationSummary,
	type TimelineEvent,
} from "@/lib/student-data";
import { useStudentApplicationStore } from "@/store/student-application-store";

function toSubmittedTimeline(submittedAt: string): TimelineEvent[] {
	return [
		{
			label: "Application Created",
			status: "complete",
			date: submittedAt,
			note: "Your draft was completed and ready for final submission.",
		},
		{
			label: "Submitted",
			status: "complete",
			date: submittedAt,
			note: "Application successfully submitted and queued for review.",
		},
		{
			label: "AI Scoring",
			status: "current",
			date: "Pending",
			note: "Automated scoring and checks are in progress.",
		},
		{
			label: "Ward Review",
			status: "upcoming",
			date: "Pending",
			note: "Ward bursary committee review starts after scoring completes.",
		},
		{
			label: "County Review",
			status: "upcoming",
			date: "Pending",
			note: "County finance team will make final allocation decisions.",
		},
	];
}

function mergeApplications(
	base: StudentApplicationSummary[],
	submissionsByProgram: Record<string, {
		id: string;
		programId: string;
		programName: string;
		status: "SUBMITTED";
		reference: string;
		requestedKes: number;
		submittedAt: string;
		updatedAt: string;
	}>,
): StudentApplicationSummary[] {
	const mergedBase = base.map((application) => {
		const submission = submissionsByProgram[application.programId];
		if (!submission || application.status !== "DRAFT") {
			return application;
		}

		return {
			...application,
			status: submission.status,
			reference: submission.reference,
			requestedKes: submission.requestedKes,
			submittedAt: submission.submittedAt,
			updatedAt: submission.updatedAt,
		};
	});

	const existingProgramIds = new Set(mergedBase.map((item) => item.programId));
	const extraSubmissions = Object.values(submissionsByProgram)
		.filter((submission) => !existingProgramIds.has(submission.programId))
		.map((submission) => ({
			id: submission.id,
			reference: submission.reference,
			programId: submission.programId,
			programName: submission.programName,
			status: submission.status,
			requestedKes: submission.requestedKes,
			submittedAt: submission.submittedAt,
			updatedAt: submission.updatedAt,
		}));

	return [...mergedBase, ...extraSubmissions].sort((a, b) => {
		return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
	});
}

export function useApplication() {
	const hydrateSubmissions = useStudentApplicationStore((state) => state.hydrate);
	const submitApplication = useStudentApplicationStore((state) => state.submitApplication);
	const submissionsByProgram = useStudentApplicationStore((state) => state.submissionsByProgram);

	useEffect(() => {
		hydrateSubmissions();
	}, [hydrateSubmissions]);

	const mergedApplications = useMemo(
		() => mergeApplications(applications, submissionsByProgram),
		[submissionsByProgram],
	);

	const getMergedApplicationById = useCallback(
		(applicationId: string): StudentApplicationSummary | null => {
			return mergedApplications.find((application) => application.id === applicationId) ?? null;
		},
		[mergedApplications],
	);

	const getTimeline = useCallback(
		(applicationId: string): TimelineEvent[] => {
			const application = getMergedApplicationById(applicationId);
			if (!application) {
				return [];
			}

			if (application.status === "SUBMITTED") {
				return toSubmittedTimeline(application.submittedAt);
			}

			return getTimelineForApplication(applicationId);
		},
		[getMergedApplicationById],
	);

	const submitDraftApplication = useCallback(
		(payload: { programId: string; programName: string; requestedKes: number }) => {
			const existing = mergedApplications.find((item) => item.programId === payload.programId);
			return submitApplication({
				programId: payload.programId,
				programName: payload.programName,
				requestedKes: payload.requestedKes,
				applicationId: existing?.id,
			});
		},
		[mergedApplications, submitApplication],
	);

	const getApplicationByProgramId = useCallback(
		(programId: string): StudentApplicationSummary | null => {
			return mergedApplications.find((application) => application.programId === programId) ?? null;
		},
		[mergedApplications],
	);

	return {
		programs,
		applications: mergedApplications,
		getProgramById,
		getApplicationById: getMergedApplicationById,
		getTimelineForApplication: getTimeline,
		submitDraftApplication,
		getApplicationByProgramId,
	};
}

