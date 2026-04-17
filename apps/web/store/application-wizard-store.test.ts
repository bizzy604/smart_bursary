import { beforeEach, describe, expect, it } from "vitest";

import { useApplicationWizardStore } from "@/store/application-wizard-store";

describe("application wizard store", () => {
	beforeEach(() => {
		localStorage.clear();
		useApplicationWizardStore.setState({ programs: {} });
	});

	it("persists section B HELB and prior bursary fields", () => {
		const programId = "program-fidelity";
		const store = useApplicationWizardStore.getState();
		store.hydrateProgram(programId);

		const sectionBPayload = {
			requestedKes: "45000",
			feeBalanceKes: "60000",
			totalFeeKes: "120000",
			sponsorSupportKes: "18000",
			helbApplied: true,
			helbAmountKes: "30000",
			priorBursaryReceived: true,
			priorBursarySource: "County Needy Students Fund",
			priorBursaryAmountKes: "15000",
			reasonForSupport: "The family has accumulated fee arrears this term.",
		};

		store.setSectionData(programId, "section-b", sectionBPayload);

		expect(store.getSectionData(programId, "section-b")).toEqual(sectionBPayload);

		const raw = localStorage.getItem(`smart-bursary.wizard.${programId}`);
		expect(raw).not.toBeNull();
		const persisted = JSON.parse(raw ?? "{}") as {
			sectionData?: Record<string, unknown>;
		};
		expect(persisted.sectionData?.["section-b"]).toEqual(sectionBPayload);
	});

	it("preserves family status in section C payload", () => {
		const programId = "program-family-status";
		const store = useApplicationWizardStore.getState();
		store.hydrateProgram(programId);

		const sectionCPayload = {
			familyStatus: "SINGLE_PARENT",
			guardianName: "Mary Akiru",
			guardianRelationship: "Mother",
			guardianPhone: "+254700000010",
			householdSize: "6",
			dependantsInSchool: "3",
			siblings: [],
		};

		store.setSectionData(programId, "section-c", sectionCPayload);
		expect(store.getSectionData(programId, "section-c")).toEqual(sectionCPayload);
	});
});
