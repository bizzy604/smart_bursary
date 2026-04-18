import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchAdminSettingsMock, fetchWardSummaryReportMock } = vi.hoisted(() => ({
  fetchAdminSettingsMock: vi.fn(),
  fetchWardSummaryReportMock: vi.fn(),
}));

vi.mock("@/lib/admin-settings", () => ({
  fetchAdminSettings: fetchAdminSettingsMock,
}));

vi.mock("@/lib/reporting-api", () => ({
  fetchWardSummaryReport: fetchWardSummaryReportMock,
}));

import SettingsUsersPage from "@/app/(admin)/settings/users/page";

describe("SettingsUsersPage", () => {
  beforeEach(() => {
    fetchAdminSettingsMock.mockReset();
    fetchWardSummaryReportMock.mockReset();

    fetchAdminSettingsMock.mockResolvedValue({
      countyId: "county-1",
      branding: {
        countyName: "Turkana County",
      },
    });

    fetchWardSummaryReportMock.mockResolvedValue({
      generatedAt: new Date().toISOString(),
      rows: [
        {
          applicationId: "app-1",
          reference: "TRK-001",
          applicantName: "Aisha Lokiru",
          wardName: "Kalokol",
          programName: "2026 Fund",
          academicYear: "2026",
          educationLevel: "UNIVERSITY",
          status: "WARD_REVIEW",
          aiScore: 78.2,
          wardRecommendationKes: 35000,
          countyAllocationKes: 0,
          reviewerName: "Elijah Lokwang",
          reviewerStage: "WARD_REVIEW",
          reviewedAt: "2026-04-18T09:00:00.000Z",
        },
        {
          applicationId: "app-2",
          reference: "TRK-002",
          applicantName: "Musa Lomuria",
          wardName: "Lokichar",
          programName: "2026 Fund",
          academicYear: "2026",
          educationLevel: "COLLEGE",
          status: "COUNTY_REVIEW",
          aiScore: 82.5,
          wardRecommendationKes: 42000,
          countyAllocationKes: 42000,
          reviewerName: "County Finance Officer",
          reviewerStage: "COUNTY_REVIEW",
          reviewedAt: "2026-04-18T10:15:00.000Z",
        },
      ],
    });
  });

  it("loads reviewer telemetry and filters by stage", async () => {
    const user = userEvent.setup();
    render(<SettingsUsersPage />);

    await waitFor(() => {
      expect(fetchAdminSettingsMock).toHaveBeenCalledTimes(1);
      expect(fetchWardSummaryReportMock).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText("Users and Review Workforce")).toBeInTheDocument();
    expect(screen.getByText("Elijah Lokwang")).toBeInTheDocument();
    expect(screen.getByText("County Finance Officer")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Filter reviewers by stage"), "COUNTY_REVIEW");

    expect(screen.queryByText("Elijah Lokwang")).not.toBeInTheDocument();
    expect(screen.getByText("County Finance Officer")).toBeInTheDocument();
  });
});
