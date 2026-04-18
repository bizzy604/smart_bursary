import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchDashboardReportMock, fetchWardSummaryReportMock } = vi.hoisted(() => ({
  fetchDashboardReportMock: vi.fn(),
  fetchWardSummaryReportMock: vi.fn(),
}));

vi.mock("@/lib/reporting-api", () => ({
  fetchDashboardReport: fetchDashboardReportMock,
  fetchWardSummaryReport: fetchWardSummaryReportMock,
}));

import SettingsWardsPage from "@/app/(admin)/settings/wards/page";

describe("SettingsWardsPage", () => {
  beforeEach(() => {
    fetchDashboardReportMock.mockReset();
    fetchWardSummaryReportMock.mockReset();

    fetchDashboardReportMock.mockResolvedValue({
      totalApplications: 3,
      approvedApplications: 2,
      rejectedApplications: 0,
      disbursedCount: 1,
      approvalRate: 66.7,
      as_of: new Date().toISOString(),
      programs: [],
      ward_breakdown: [
        {
          ward_id: "ward-1",
          ward_name: "Kalokol",
          applications: 2,
          approved: 1,
          allocated_kes: 50000,
        },
        {
          ward_id: "ward-2",
          ward_name: "Lokichar",
          applications: 1,
          approved: 1,
          allocated_kes: 42000,
        },
      ],
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
          status: "COUNTY_REVIEW",
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
          status: "DISBURSED",
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

  it("renders ward analytics and supports search", async () => {
    const user = userEvent.setup();
    render(<SettingsWardsPage />);

    await waitFor(() => {
      expect(fetchDashboardReportMock).toHaveBeenCalledTimes(1);
      expect(fetchWardSummaryReportMock).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText("Wards Coverage and Allocation View")).toBeInTheDocument();
    expect(screen.getByText("Kalokol")).toBeInTheDocument();
    expect(screen.getByText("Lokichar")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Search wards"), "kalo");

    expect(screen.getByText("Kalokol")).toBeInTheDocument();
    expect(screen.queryByText("Lokichar")).not.toBeInTheDocument();
  });
});
