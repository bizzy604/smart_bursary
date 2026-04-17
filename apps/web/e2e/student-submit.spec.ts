import { expect, type Page, test } from "@playwright/test";

async function startApplicationFromPrograms(page: Page): Promise<string> {
	await page.goto("/programs");
	await expect(page.getByRole("heading", { name: "Eligible Programs" })).toBeVisible();

	await page.getByRole("button", { name: "Open" }).first().click();
	await expect(page.getByRole("button", { name: "Apply Now" })).toBeVisible();

	const programMatch = page.url().match(/\/programs\/([^/?#]+)/);
	if (!programMatch?.[1]) {
		throw new Error(`Unable to resolve program id from URL: ${page.url()}`);
	}

	const programId = programMatch[1];
	await page.getByRole("button", { name: "Apply Now" }).click();
	await expect(page).toHaveURL(new RegExp(`/apply/${programId}$`));

	await page.getByRole("button", { name: /Start Application|Resume Application/ }).click();
	await expect(page).toHaveURL(new RegExp(`/apply/${programId}/section-a$`));

	return programId;
}

async function completeSectionA(page: Page, programId: string): Promise<void> {
	await expect(page.getByRole("heading", { name: /Section A/i })).toBeVisible();
	await page.getByLabel("Full Name").fill("E2E Student Applicant");
	await page.getByLabel("National ID / Birth Cert No.").fill("12345678");
	await page.getByLabel("Phone Number").fill("+254712345678");
	await page.getByLabel("Email Address").fill("e2e.student@example.com");
	await page.getByLabel("Institution").fill("University of Nairobi");
	await page.getByLabel("Admission Number").fill("F56/1234/2023");
	await page.getByLabel("Course / Class").fill("Bachelor of Education");
	await page.getByLabel("Year of Study").fill("Year 2");
	await page.getByRole("button", { name: "Save and Continue" }).click();
	await expect(page).toHaveURL(new RegExp(`/apply/${programId}/section-b$`));
}

async function completeSectionB(page: Page, programId: string): Promise<void> {
	await expect(page.getByRole("heading", { name: /Section B/i })).toBeVisible();
	await page.getByLabel("Requested Amount (KES)").fill("45000");
	await page.getByLabel("Current Fee Balance (KES)").fill("60000");
	await page.getByLabel("Total Annual Fee (KES)").fill("75000");
	await page.getByLabel("Support from Other Sponsors (KES)").fill("15000");
	await page
		.getByPlaceholder("Describe your current financial challenge and how this bursary will support your studies.")
		.fill("I need support to clear outstanding fees and avoid deferring my studies this term.");
	await page.getByRole("button", { name: "Save and Continue" }).click();
	await expect(page).toHaveURL(new RegExp(`/apply/${programId}/section-c$`));
}

async function completeSectionC(page: Page, programId: string): Promise<void> {
	await expect(page.getByRole("heading", { name: /Section C/i })).toBeVisible();
	await page.getByLabel("Guardian/Parent Name").fill("Mary Akinyi");
	await page.getByLabel("Relationship").fill("Mother");
	await page.getByLabel("Phone Number").fill("+254700000111");
	await page.getByLabel("Occupation").fill("Trader");
	await page.getByLabel("Total Household Members").fill("5");
	await page.getByLabel("Dependants in School").fill("3");
	await page.getByRole("button", { name: "Save and Continue" }).click();
	await expect(page).toHaveURL(new RegExp(`/apply/${programId}/section-d$`));
}

async function completeSectionD(page: Page, programId: string): Promise<void> {
	await expect(page.getByRole("heading", { name: /Section D/i })).toBeVisible();
	await page.getByLabel("Father Monthly Income (KES)").fill("20000");
	await page.getByLabel("Mother Monthly Income (KES)").fill("12000");
	await page
		.getByPlaceholder("Describe your current hardship and why bursary support is critical this term.")
		.fill("Household income is strained by school fees for multiple dependants and rising medical costs.");
	await page.getByRole("button", { name: "Save and Continue" }).click();
	await expect(page).toHaveURL(new RegExp(`/apply/${programId}/section-e$`));
}

async function completeSectionE(page: Page, programId: string): Promise<void> {
	await expect(page.getByRole("heading", { name: /Section E/i })).toBeVisible();
	await page.getByLabel("Declaration Full Name").fill("E2E Student Applicant");
	await page.getByRole("checkbox", { name: "I confirm that all information provided is true and complete." }).check();
	await page
		.getByRole("checkbox", { name: "I authorize verification with my school and local administration offices." })
		.check();
	await page
		.getByRole("checkbox", { name: "I accept county privacy and data processing terms for this bursary program." })
		.check();
	await page.getByRole("button", { name: "Save and Continue" }).click();
	await expect(page).toHaveURL(new RegExp(`/apply/${programId}/section-f$`));
}

async function completeSectionF(page: Page, programId: string): Promise<void> {
	await expect(page.getByRole("heading", { name: /Section F/i })).toBeVisible();

	const uploadInputs = page.locator('input[type="file"]');
	for (let index = 0; index < 3; index += 1) {
		await uploadInputs.nth(index).setInputFiles({
			name: `supporting-document-${index + 1}.pdf`,
			mimeType: "application/pdf",
			buffer: Buffer.from("test-document-content", "utf8"),
		});
	}

	await expect(page.getByText("Selected:")).toHaveCount(3);
	await page.getByRole("button", { name: "Continue to Preview" }).click();
	await expect(page).toHaveURL(new RegExp(`/apply/${programId}/preview$`));
}

async function submitFromPreview(page: Page): Promise<string> {
	await expect(page.getByRole("heading", { name: "Review Your Application" })).toBeVisible();
	await page
		.getByRole("checkbox", { name: "I declare that the information given is true to the best of my knowledge." })
		.check();
	await page.getByRole("button", { name: "Submit Application" }).click();
	await expect(page).toHaveURL(/\/applications\/.+\?submitted=1$/);

	const match = page.url().match(/\/applications\/([^/?#]+)/);
	if (!match?.[1]) {
		throw new Error(`Unable to resolve application id from URL: ${page.url()}`);
	}

	return match[1];
}

test("@critical student can complete, submit, and export application", async ({ page, request }) => {
	const programId = await startApplicationFromPrograms(page);

	await completeSectionA(page, programId);
	await completeSectionB(page, programId);
	await completeSectionC(page, programId);
	await completeSectionD(page, programId);
	await completeSectionE(page, programId);
	await completeSectionF(page, programId);

	const applicationId = await submitFromPreview(page);
	await expect(page.getByText("Submitted")).toBeVisible();

	const printableResponse = await request.get(`/applications/${applicationId}/pdf?download=true`);
	expect(printableResponse.status()).toBe(200);
	expect(printableResponse.headers()["content-type"]).toContain("text/html");
	expect(printableResponse.headers()["content-disposition"]).toContain("attachment");
	expect(await printableResponse.text()).toContain("County Government Bursary Form");
});
