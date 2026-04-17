import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchAdminSettingsMock, updateAdminSettingsMock } = vi.hoisted(() => ({
	fetchAdminSettingsMock: vi.fn(),
	updateAdminSettingsMock: vi.fn(),
}));

vi.mock("@/lib/admin-settings", () => ({
	FORM_SECTION_ORDER: ["section-a", "section-b", "section-c", "section-d", "section-e", "section-f"],
	SECTION_LABELS: {
		"section-a": "A. Personal Details",
		"section-b": "B. Amounts Applied",
		"section-c": "C. Family Details",
		"section-d": "D. Financial Status",
		"section-e": "E. Other Disclosures",
		"section-f": "F. Supporting Documents",
	},
	fetchAdminSettings: fetchAdminSettingsMock,
	updateAdminSettings: updateAdminSettingsMock,
}));

import SettingsHomePage from "@/app/(admin)/settings/page";

describe("SettingsHomePage", () => {
	beforeEach(() => {
		fetchAdminSettingsMock.mockReset();
		updateAdminSettingsMock.mockReset();

		fetchAdminSettingsMock.mockResolvedValue({
			countyId: "county-1",
			branding: {
				countyName: "Turkana County",
				fundName: "Turkana Fund",
				legalReference: "No. 4 of 2023",
				primaryColor: "#1E3A5F",
				logoText: "TC",
				logoS3Key: "",
			},
			formCustomization: {
				colorScheme: "COUNTY_PRIMARY",
				logoPlacement: "HEADER_CENTER",
				sectionOrder: ["section-a", "section-b", "section-c", "section-d", "section-e", "section-f"],
			},
			scoringWeights: {
				family_status: 0.25,
				family_income: 0.25,
				education_burden: 0.2,
				academic_standing: 0.1,
				document_quality: 0.1,
				integrity: 0.1,
			},
			updatedAt: new Date().toISOString(),
		});

		updateAdminSettingsMock.mockImplementation(async (payload: unknown) => ({
			countyId: "county-1",
			branding: {
				countyName: "Turkana County",
				fundName: "Turkana Fund",
				legalReference: "No. 4 of 2023",
				primaryColor: "#1E3A5F",
				logoText: "TC",
				logoS3Key: "",
			},
			formCustomization: (payload as { formCustomization: { colorScheme: string; logoPlacement: string; sectionOrder: string[] } }).formCustomization,
			scoringWeights: {
				family_status: 0.25,
				family_income: 0.25,
				education_burden: 0.2,
				academic_standing: 0.1,
				document_quality: 0.1,
				integrity: 0.1,
			},
			updatedAt: new Date().toISOString(),
		}));
	});

	it("saves form customization updates", async () => {
		const user = userEvent.setup();
		render(<SettingsHomePage />);

		await waitFor(() => {
			expect(fetchAdminSettingsMock).toHaveBeenCalledTimes(1);
		});

		const downButtons = await screen.findAllByRole("button", { name: "Down" });
		await user.click(downButtons[0]);
		await user.click(screen.getByRole("button", { name: "Save Form Customization" }));

		await waitFor(() => {
			expect(updateAdminSettingsMock).toHaveBeenCalledTimes(1);
		});

		expect(updateAdminSettingsMock).toHaveBeenCalledWith(
			expect.objectContaining({
				formCustomization: expect.objectContaining({
					sectionOrder: ["section-b", "section-a", "section-c", "section-d", "section-e", "section-f"],
				}),
			}),
		);
	});
});
