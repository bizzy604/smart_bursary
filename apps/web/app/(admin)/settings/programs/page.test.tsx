import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  closeAdminProgramMock,
  fetchAdminProgramsMock,
  publishAdminProgramMock,
} = vi.hoisted(() => ({
  fetchAdminProgramsMock: vi.fn(),
  publishAdminProgramMock: vi.fn(),
  closeAdminProgramMock: vi.fn(),
}));

vi.mock("@/lib/admin-programs", () => ({
  fetchAdminPrograms: fetchAdminProgramsMock,
  publishAdminProgram: publishAdminProgramMock,
  closeAdminProgram: closeAdminProgramMock,
}));

import ProgramSettingsListPage from "@/app/(admin)/settings/programs/page";

const draftProgram = {
  id: "prog-2026",
  wardId: null,
  name: "2026 County Bursary Intake",
  description: "Main county bursary cycle",
  budgetCeiling: 1500000,
  allocatedTotal: 0,
  disbursedTotal: 0,
  opensAt: "2026-04-20T08:00:00.000Z",
  closesAt: "2026-05-20T17:00:00.000Z",
  academicYear: "2026",
  status: "DRAFT" as const,
};

const secondDraftProgram = {
  ...draftProgram,
  id: "prog-2027",
  name: "2027 County Bursary Intake",
  academicYear: "2027",
};

describe("ProgramSettingsListPage", () => {
  beforeEach(() => {
    fetchAdminProgramsMock.mockReset();
    publishAdminProgramMock.mockReset();
    closeAdminProgramMock.mockReset();

    fetchAdminProgramsMock.mockResolvedValue([draftProgram]);
    publishAdminProgramMock.mockResolvedValue({
      id: draftProgram.id,
      status: "ACTIVE",
    });
    closeAdminProgramMock.mockResolvedValue({
      id: draftProgram.id,
      status: "CLOSED",
      closesAt: draftProgram.closesAt,
    });
  });

  it("publishes a draft program and refreshes list data", async () => {
    const user = userEvent.setup();

    fetchAdminProgramsMock
      .mockResolvedValueOnce([draftProgram])
      .mockResolvedValueOnce([{ ...draftProgram, status: "ACTIVE" as const }]);

    render(<ProgramSettingsListPage />);

    await waitFor(() => {
      expect(fetchAdminProgramsMock).toHaveBeenCalledTimes(1);
    });

    await user.click(await screen.findByRole("button", { name: "Publish" }));
    await user.click(
      await screen.findByRole("button", { name: "Confirm Publish" }),
    );

    await waitFor(() => {
      expect(publishAdminProgramMock).toHaveBeenCalledWith("prog-2026");
    });
    await waitFor(() => {
      expect(fetchAdminProgramsMock).toHaveBeenCalledTimes(2);
    });

    expect(
      await screen.findByText("Program published successfully."),
    ).toBeInTheDocument();
  });

  it("publishes selected draft programs from the toolbar", async () => {
    const user = userEvent.setup();

    fetchAdminProgramsMock
      .mockResolvedValueOnce([draftProgram, secondDraftProgram])
      .mockResolvedValueOnce([
        { ...draftProgram, status: "ACTIVE" as const },
        { ...secondDraftProgram, status: "ACTIVE" as const },
      ]);

    render(<ProgramSettingsListPage />);

    await waitFor(() => {
      expect(fetchAdminProgramsMock).toHaveBeenCalledTimes(1);
    });

    await user.click(
      await screen.findByRole("checkbox", { name: "Select row prog-2026" }),
    );
    await user.click(
      await screen.findByRole("checkbox", { name: "Select row prog-2027" }),
    );

    expect(await screen.findByText("2 selected")).toBeInTheDocument();

    await user.click(
      await screen.findByRole("button", { name: "Publish selected (2)" }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Confirm Publish" }),
    );

    await waitFor(() => {
      expect(publishAdminProgramMock).toHaveBeenNthCalledWith(1, "prog-2026");
      expect(publishAdminProgramMock).toHaveBeenNthCalledWith(2, "prog-2027");
    });
    await waitFor(() => {
      expect(fetchAdminProgramsMock).toHaveBeenCalledTimes(2);
    });

    expect(
      await screen.findByText("2 programs published successfully."),
    ).toBeInTheDocument();
  });
});
