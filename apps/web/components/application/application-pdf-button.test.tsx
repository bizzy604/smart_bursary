import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationPdfButton } from "@/components/application/application-pdf-button";
import type { PreviewSection } from "@/lib/application-preview";

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

		Object.defineProperty(globalThis.URL, "createObjectURL", {
			writable: true,
			value: vi.fn(() => "blob:application-pdf"),
		});
		Object.defineProperty(globalThis.URL, "revokeObjectURL", {
			writable: true,
			value: vi.fn(),
		});
	});

	it("downloads a PDF using provided preview sections", async () => {
		const user = userEvent.setup();
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			blob: () => Promise.resolve(new Blob(["pdf"], { type: "application/pdf" })),
		});
		const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

		vi.stubGlobal("fetch", fetchMock);

		render(
			<ApplicationPdfButton
				programName="2024 Ward Bursary Programme"
				reference="TRK-2026-00142"
				generatedAt="2026-04-12T09:18:00Z"
				sections={previewSections}
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
