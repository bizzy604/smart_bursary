import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchScoringWeightsMock, updateScoringWeightsMock } = vi.hoisted(() => ({
	fetchScoringWeightsMock: vi.fn(),
	updateScoringWeightsMock: vi.fn(),
}));

vi.mock("@/lib/admin-settings", () => ({
	DEFAULT_SCORING_WEIGHTS: {
		family_status: 0.25,
		family_income: 0.25,
		education_burden: 0.2,
		academic_standing: 0.1,
		document_quality: 0.1,
		integrity: 0.1,
	},
	fetchScoringWeights: fetchScoringWeightsMock,
	updateScoringWeights: updateScoringWeightsMock,
}));

import AiScoringSettingsPage from "@/app/(admin)/settings/ai-scoring/page";

describe("AiScoringSettingsPage", () => {
	beforeEach(() => {
		fetchScoringWeightsMock.mockReset();
		updateScoringWeightsMock.mockReset();

		fetchScoringWeightsMock.mockResolvedValue({
			weights: {
				family_status: 0.25,
				family_income: 0.25,
				education_burden: 0.2,
				academic_standing: 0.1,
				document_quality: 0.1,
				integrity: 0.1,
			},
			scoringWeightsUpdatedAt: null,
		});
		updateScoringWeightsMock.mockResolvedValue({
			weights: {
				family_status: 0.3,
				family_income: 0.2,
				education_burden: 0.2,
				academic_standing: 0.1,
				document_quality: 0.1,
				integrity: 0.1,
			},
			scoringWeightsUpdatedAt: new Date().toISOString(),
		});
	});

	it("submits updated scoring weights when total is exactly 100 percent", async () => {
		const user = userEvent.setup();
		render(<AiScoringSettingsPage />);

		await waitFor(() => {
			expect(fetchScoringWeightsMock).toHaveBeenCalledTimes(1);
		});

		const numberInputs = await screen.findAllByRole("spinbutton");
		await user.clear(numberInputs[0]);
		await user.type(numberInputs[0], "0.3");
		await user.clear(numberInputs[1]);
		await user.type(numberInputs[1], "0.2");

		await user.click(screen.getByRole("button", { name: "Save Weights" }));

		await waitFor(() => {
			expect(updateScoringWeightsMock).toHaveBeenCalledTimes(1);
		});

		expect(updateScoringWeightsMock).toHaveBeenCalledWith(
			expect.objectContaining({
				family_status: 0.3,
				family_income: 0.2,
			}),
		);
	});
});
