import { create } from "zustand";

import type { PreviewSection } from "@/lib/application-preview";

export interface SubmittedApplicationRecord {
  id: string;
  programId: string;
  programName: string;
  status: "SUBMITTED";
  reference: string;
  requestedKes: number;
  submittedAt: string;
  updatedAt: string;
  previewSections: PreviewSection[];
}

interface SubmitApplicationPayload {
  programId: string;
  programName: string;
  requestedKes: number;
  applicationId?: string;
  previewSections: PreviewSection[];
}

interface StudentApplicationStore {
  hydrated: boolean;
  submissionsByProgram: Record<string, SubmittedApplicationRecord>;
  hydrate: () => void;
  submitApplication: (payload: SubmitApplicationPayload) => SubmittedApplicationRecord;
}

const STORAGE_KEY = "smart-bursary.submissions";

function makeReference(): string {
  const year = new Date().getFullYear();
  const serial = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
  return `TRK-${year}-${serial}`;
}

function loadFromStorage(): Record<string, SubmittedApplicationRecord> {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as Record<string, SubmittedApplicationRecord>;
  } catch {
    return {};
  }
}

function persistToStorage(submissions: Record<string, SubmittedApplicationRecord>): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));
}

export const useStudentApplicationStore = create<StudentApplicationStore>((set, get) => ({
  hydrated: false,
  submissionsByProgram: {},
  hydrate: () => {
    if (get().hydrated) {
      return;
    }

    const submissions = loadFromStorage();
    set({ submissionsByProgram: submissions, hydrated: true });
  },
  submitApplication: ({ programId, programName, requestedKes, applicationId, previewSections }) => {
    const current = get().submissionsByProgram[programId];
    if (current) {
      return current;
    }

    const now = new Date().toISOString();
    const record: SubmittedApplicationRecord = {
      id: applicationId ?? `submitted-${programId}`,
      programId,
      programName,
      status: "SUBMITTED",
      reference: makeReference(),
      requestedKes,
      submittedAt: now,
      updatedAt: now,
      previewSections,
    };

    const next = {
      ...get().submissionsByProgram,
      [programId]: record,
    };

    set({ submissionsByProgram: next });
    persistToStorage(next);

    return record;
  },
}));
