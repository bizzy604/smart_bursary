import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchAdminSettingsMock, updateAdminSettingsMock, setCountyMock } = vi.hoisted(() => ({
	fetchAdminSettingsMock: vi.fn(),
	updateAdminSettingsMock: vi.fn(),
	setCountyMock: vi.fn(),
}));

vi.mock("@/hooks/use-county", () => ({
	useCounty: () => ({
		county: {
			name: "Turkana County",
			fundName: "Turkana Fund",
			logoText: "TC",
			primaryColor: "#1E3A5F",
			legalReference: "No. 4 of 2023",
		},
		setCounty: setCountyMock,
	}),
}));

vi.mock("@/lib/admin-settings", () => ({
	fetchAdminSettings: fetchAdminSettingsMock,
	updateAdminSettings: updateAdminSettingsMock,
}));

import BrandingSettingsPage from "@/app/(admin)/settings/branding/page";

describe("BrandingSettingsPage", () => {
	beforeEach(() => {
		fetchAdminSettingsMock.mockReset();
		updateAdminSettingsMock.mockReset();
		setCountyMock.mockReset();

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

		updateAdminSettingsMock.mockResolvedValue({
			countyId: "county-1",
			branding: {
				countyName: "Turkana County Updated",
				fundName: "Turkana Future Fund",
				legalReference: "No. 12 of 2026",
				primaryColor: "#0F4C81",
				logoText: "TU",
				logoS3Key: "county-assets/turkana/logo.png",
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
	});

	it("persists branding updates and refreshes county store", async () => {
		const user = userEvent.setup();
		render(<BrandingSettingsPage />);

		await waitFor(() => {
			expect(fetchAdminSettingsMock).toHaveBeenCalledTimes(1);
		});

		const countyNameInput = await screen.findByLabelText("County Name");
		await user.clear(countyNameInput);
		await user.type(countyNameInput, "Turkana County Updated");
		await user.click(screen.getByRole("button", { name: "Save Branding" }));

		await waitFor(() => {
			expect(updateAdminSettingsMock).toHaveBeenCalledTimes(1);
		});

		expect(updateAdminSettingsMock).toHaveBeenCalledWith(
			expect.objectContaining({
				branding: expect.objectContaining({
					countyName: "Turkana County Updated",
				}),
			}),
		);
		expect(setCountyMock).toHaveBeenCalledWith(
			expect.objectContaining({
				name: "Turkana County Updated",
				primaryColor: "#0F4C81",
			}),
		);
	});
});
