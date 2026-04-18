import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createAdminProgramMock, pushMock } = vi.hoisted(() => ({
	createAdminProgramMock: vi.fn(),
	pushMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: pushMock,
	}),
}));

vi.mock("@/lib/admin-programs", () => ({
	createAdminProgram: createAdminProgramMock,
}));

import NewProgramSettingsPage from "@/app/(admin)/settings/programs/new/page";

describe("NewProgramSettingsPage", () => {
	beforeEach(() => {
		createAdminProgramMock.mockReset();
		pushMock.mockReset();

		createAdminProgramMock.mockResolvedValue({
			id: "prog-created-1",
			wardId: null,
			name: "2026 County Bursary Intake",
			description: "Eligibility and policy notes",
			budgetCeiling: 450000,
			allocatedTotal: 0,
			disbursedTotal: 0,
			opensAt: "2026-04-20T08:00:00.000Z",
			closesAt: "2026-05-20T17:00:00.000Z",
			academicYear: "2026",
			status: "DRAFT",
			eligibilityRules: [],
		});
	});

	it("creates a program and navigates to the detail page", async () => {
		const user = userEvent.setup();
		render(<NewProgramSettingsPage />);

		await user.type(screen.getByLabelText("Program Name"), "2026 County Bursary Intake");
		await user.type(screen.getByLabelText("Budget Ceiling (KES)"), "450000");
		fireEvent.change(screen.getByLabelText("Opens At"), { target: { value: "2026-04-20T08:00" } });
		fireEvent.change(screen.getByLabelText("Closes At"), { target: { value: "2026-05-20T17:00" } });

		await user.click(screen.getByRole("button", { name: "Create Program" }));

		await waitFor(() => {
			expect(createAdminProgramMock).toHaveBeenCalledTimes(1);
		});

		const payload = createAdminProgramMock.mock.calls[0]?.[0] as {
			name: string;
			budgetCeiling: number;
			opensAt: string;
			closesAt: string;
		};
		expect(payload.name).toBe("2026 County Bursary Intake");
		expect(payload.budgetCeiling).toBe(450000);
		expect(Date.parse(payload.closesAt)).toBeGreaterThan(Date.parse(payload.opensAt));

		await waitFor(() => {
			expect(pushMock).toHaveBeenCalledWith("/settings/programs/prog-created-1");
		});
	});
});
