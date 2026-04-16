import { create } from "zustand";

export type SectionSlug = "section-a" | "section-b" | "section-c" | "section-d" | "section-e" | "section-f";

const SECTION_ORDER: SectionSlug[] = [
	"section-a",
	"section-b",
	"section-c",
	"section-d",
	"section-e",
	"section-f",
];

const defaultCompletion = (): Record<SectionSlug, boolean> => ({
	"section-a": false,
	"section-b": false,
	"section-c": false,
	"section-d": false,
	"section-e": false,
	"section-f": false,
});

type SectionDataMap = Record<SectionSlug, Record<string, unknown>>;

interface ProgramWizardState {
	sectionData: SectionDataMap;
	completion: Record<SectionSlug, boolean>;
	lastSavedAt: string | null;
}

interface ApplicationWizardState {
	programs: Record<string, ProgramWizardState>;
	hydrateProgram: (programId: string) => void;
	setSectionData: (programId: string, section: SectionSlug, data: Record<string, unknown>) => void;
	getSectionData: (programId: string, section: SectionSlug) => Record<string, unknown>;
	setSectionComplete: (programId: string, section: SectionSlug, complete: boolean) => void;
	getCompletedSections: (programId: string) => SectionSlug[];
	isSectionUnlocked: (programId: string, section: SectionSlug) => boolean;
	resetProgram: (programId: string) => void;
}

function getStorageKey(programId: string): string {
	return `smart-bursary.wizard.${programId}`;
}

function createDefaultProgramState(): ProgramWizardState {
	return {
		sectionData: {
			"section-a": {},
			"section-b": {},
			"section-c": {},
			"section-d": {},
			"section-e": {},
			"section-f": {},
		},
		completion: defaultCompletion(),
		lastSavedAt: null,
	};
}

function persistProgram(programId: string, programState: ProgramWizardState): void {
	if (typeof window === "undefined") {
		return;
	}

	window.localStorage.setItem(getStorageKey(programId), JSON.stringify(programState));
}

function loadProgram(programId: string): ProgramWizardState | null {
	if (typeof window === "undefined") {
		return null;
	}

	const raw = window.localStorage.getItem(getStorageKey(programId));
	if (!raw) {
		return null;
	}

	try {
		const parsed = JSON.parse(raw) as ProgramWizardState;
		return {
			sectionData: {
				"section-a": parsed.sectionData?.["section-a"] ?? {},
				"section-b": parsed.sectionData?.["section-b"] ?? {},
				"section-c": parsed.sectionData?.["section-c"] ?? {},
				"section-d": parsed.sectionData?.["section-d"] ?? {},
				"section-e": parsed.sectionData?.["section-e"] ?? {},
				"section-f": parsed.sectionData?.["section-f"] ?? {},
			},
			completion: {
				...defaultCompletion(),
				...(parsed.completion ?? {}),
			},
			lastSavedAt: parsed.lastSavedAt ?? null,
		};
	} catch {
		return null;
	}
}

export const useApplicationWizardStore = create<ApplicationWizardState>((set, get) => ({
	programs: {},
	hydrateProgram: (programId) => {
		const current = get().programs[programId];
		if (current) {
			return;
		}

		const fromStorage = loadProgram(programId);
		const initial = fromStorage ?? createDefaultProgramState();

		set((state) => ({
			programs: {
				...state.programs,
				[programId]: initial,
			},
		}));
	},
	setSectionData: (programId, section, data) => {
		const current = get().programs[programId] ?? createDefaultProgramState();
		const nextProgram: ProgramWizardState = {
			...current,
			sectionData: {
				...current.sectionData,
				[section]: data,
			},
			lastSavedAt: new Date().toISOString(),
		};

		set((state) => ({
			programs: {
				...state.programs,
				[programId]: nextProgram,
			},
		}));

		persistProgram(programId, nextProgram);
	},
	getSectionData: (programId, section) => {
		return get().programs[programId]?.sectionData?.[section] ?? {};
	},
	setSectionComplete: (programId, section, complete) => {
		const current = get().programs[programId] ?? createDefaultProgramState();
		const nextProgram: ProgramWizardState = {
			...current,
			completion: {
				...current.completion,
				[section]: complete,
			},
			lastSavedAt: new Date().toISOString(),
		};

		set((state) => ({
			programs: {
				...state.programs,
				[programId]: nextProgram,
			},
		}));

		persistProgram(programId, nextProgram);
	},
	getCompletedSections: (programId) => {
		const completion = get().programs[programId]?.completion ?? defaultCompletion();
		return SECTION_ORDER.filter((section) => completion[section]);
	},
	isSectionUnlocked: (programId, section) => {
		const completion = get().programs[programId]?.completion ?? defaultCompletion();
		const index = SECTION_ORDER.indexOf(section);
		if (index <= 0) {
			return true;
		}

		return completion[SECTION_ORDER[index - 1]];
	},
	resetProgram: (programId) => {
		const nextProgram = createDefaultProgramState();

		set((state) => ({
			programs: {
				...state.programs,
				[programId]: nextProgram,
			},
		}));

		persistProgram(programId, nextProgram);
	},
}));

