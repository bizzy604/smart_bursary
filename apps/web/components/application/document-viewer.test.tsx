import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DocumentViewer } from "@/components/application/document-viewer";
import { downloadTextFile, openPreviewHtml } from "@/lib/client-download";
import type { SupportingDocument } from "@/lib/review-types";

vi.mock("@/lib/client-download", () => ({
	downloadTextFile: vi.fn(),
	openPreviewHtml: vi.fn(),
}));

describe("DocumentViewer", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("disables actions for missing documents", () => {
		const docs: SupportingDocument[] = [{ id: "doc-missing", label: "Admission Letter", status: "MISSING" }];
		render(<DocumentViewer documents={docs} />);

		expect(screen.getByRole("button", { name: "View" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "Download" })).toBeDisabled();
	});

	it("previews and downloads non-missing documents", async () => {
		const user = userEvent.setup();
		const docs: SupportingDocument[] = [{ id: "doc-fee", label: "Fee Structure", status: "VERIFIED" }];
		render(<DocumentViewer documents={docs} />);

		await user.click(screen.getByRole("button", { name: "View" }));
		await user.click(screen.getByRole("button", { name: "Download" }));

		expect(openPreviewHtml).toHaveBeenCalledTimes(1);
		expect(downloadTextFile).toHaveBeenCalledTimes(1);
	});
});
