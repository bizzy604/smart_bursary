"use client";

import {
	applications,
	getApplicationById,
	getProgramById,
	getTimelineForApplication,
	programs,
} from "@/lib/student-data";

export function useApplication() {
	return {
		programs,
		applications,
		getProgramById,
		getApplicationById,
		getTimelineForApplication,
	};
}

