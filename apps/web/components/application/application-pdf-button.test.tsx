import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationPdfButton } from "@/components/application/application-pdf-button";
import type { PreviewSection } from "@/lib/application-preview";
import { useApplicationWizardStore } from "@/store/application-wizard-store";
import { useStudentApplicationStore } from "@/store/student-application-store";

const previewSections: PreviewSection[] = [
	{
		slug: "section-a",
		title: "A. Student Personal Details",
		entries: [{ label: "Full Name", value: "Aisha Lokiru" }],
	},
];

describe("ApplicationPdfButton", () => {
	beforeEach(() => {
		localStorage.clear();
		useStudentApplicationStore.setState({ hydrated: true, submissionsByProgram: {} });
		useApplicationWizardStore.setState({ programs: {} });

		Object.defineProperty(globalThis.URL, "createObjectURL", {
			writable: true,
			value: vi.fn(() => "blob:application-pdf"),
		});
		Object.defineProperty(globalThis.URL, "revokeObjectURL", {
			writable: true,
			value: vi.fn(),
		});
	});

	it("downloads a PDF using the captured submission snapshot", async () => {
		const user = userEvent.setup();
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			blob: () => Promise.resolve(new Blob(["pdf"], { type: "application/pdf" })),
		});
		const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

		vi.stubGlobal("fetch", fetchMock);

		useStudentApplicationStore.setState({
			hydrated: true,
			submissionsByProgram: {
				"prog-ward-2024": {
					id: "app-00142",
					programId: "prog-ward-2024",
					programName: "2024 Ward Bursary Programme",
					status: "SUBMITTED",
					reference: "TRK-2026-00142",
					requestedKes: 45000,
					submittedAt: "2026-04-10T11:22:00Z",
					updatedAt: "2026-04-12T09:18:00Z",
					previewSections,
				},
			},
		});

		render(
			<ApplicationPdfButton
				applicationId="app-00142"
				programId="prog-ward-2024"
				programName="2024 Ward Bursary Programme"
				reference="TRK-2026-00142"
				generatedAt="2026-04-12T09:18:00Z"
			/>,
		);

		await user.click(screen.getByRole("button", { name: "Download PDF" }));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledTimes(1);
		});

		const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe("/api/applications/preview/pdf");
		expect(options.method).toBe("POST");
		expect(JSON.parse(options.body as string)).toMatchObject({
			countyName: "Turkana County",
			fundName: "Turkana County Education Fund",
			primaryColor: "#1E3A5F",
			legalReference: "No. 4 of 2023",
			programName: "2024 Ward Bursary Programme",
			reference: "TRK-2026-00142",
			sections: previewSections,
		});
		expect(clickSpy).toHaveBeenCalledTimes(1);
	});
});
