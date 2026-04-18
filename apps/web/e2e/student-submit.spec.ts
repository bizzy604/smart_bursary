import { expect, type Page, test } from "@playwright/test";

const SECTION_KEYS = [
	"section-a",
	"section-b",
	"section-c",
	"section-d",
	"section-e",
	"section-f",
] as const;

function jsonResponse(data: unknown, status = 200): { status: number; contentType: string; body: string } {
	return {
		status,
		contentType: "application/json",
		body: JSON.stringify(data),
	};
}

function isApiPath(url: string, pattern: RegExp): boolean {
	return pattern.test(new URL(url).pathname);
}

async function mockStudentApis(page: Page): Promise<void> {
	const now = "2026-04-18T12:00:00.000Z";
	const applicationId = "app-e2e-1";
	const programId = "prog-ward-2024";
	const programName = "2026 Ward Bursary Programme";

	let draftCreated = false;
	let submitted = false;
	let submittedAt: string | null = null;
	let updatedAt = now;
	const sectionData: Record<string, Record<string, unknown>> = {};

	function buildApplicationDetail() {
		const sectionB = sectionData["section-b"] ?? {};
		const sections = SECTION_KEYS
			.filter((key) => sectionData[key])
			.map((key) => ({
				sectionKey: key,
				data: sectionData[key],
				isComplete: true,
				savedAt: updatedAt,
			}));

		return {
			id: applicationId,
			status: submitted ? "SUBMITTED" : "DRAFT",
			programId,
			totalFeeKes: Number(sectionB.totalFeeKes ?? 0),
			outstandingBalance: Number(sectionB.feeBalanceKes ?? 0),
			amountRequested: Number(sectionB.requestedKes ?? 0),
			reason: String(sectionB.reasonForSupport ?? ""),
			createdAt: now,
			updatedAt,
			submittedAt,
			sections,
			program: {
				id: programId,
				name: programName,
			},
		};
	}

	await page.route("**/api/v1/**", async (route) => {
		const url = route.request().url();
		const method = route.request().method();

		if (isApiPath(url, /\/api\/v1\/programs$/) && method === "GET") {
			await route.fulfill(
				jsonResponse([
					{
						id: programId,
						wardId: null,
						name: programName,
						description: "Supports secondary, TVET, and university students with demonstrated financial need.",
						budgetCeiling: 5000000,
						allocatedTotal: 2150000,
						disbursedTotal: 1800000,
						opensAt: "2026-01-01T00:00:00.000Z",
						closesAt: "2026-12-31T23:59:59.000Z",
						academicYear: "2026",
						status: "ACTIVE",
						eligible: true,
						ineligibilityReason: null,
						eligibilityRules: [],
					},
				]),
			);
			return;
		}

		if (isApiPath(url, /\/api\/v1\/profile$/) && method === "GET") {
			await route.fulfill(
				jsonResponse({
					personal: {
						fullName: "E2E Student Applicant",
						homeWard: "Kalokol",
						phone: "+254712345678",
					},
					academic: {
						institutionName: "University of Nairobi",
						courseName: "Bachelor of Education",
						yearFormClass: "Year 2",
					},
					family: {
						familyStatus: "SINGLE_PARENT",
						numSiblingsInSchool: 3,
						guardianIncomeKes: 32000,
					},
				}),
			);
			return;
		}

		if (isApiPath(url, /\/api\/v1\/auth\/me$/) && method === "GET") {
			await route.fulfill(
				jsonResponse({
					email: "e2e.student@example.com",
					countyId: "turkana",
				}),
			);
			return;
		}

		if (isApiPath(url, /\/api\/v1\/applications\/my-applications$/) && method === "GET") {
			if (!draftCreated && !submitted) {
				await route.fulfill(jsonResponse([]));
				return;
			}

			await route.fulfill(
				jsonResponse([
					{
						id: applicationId,
						status: submitted ? "SUBMITTED" : "DRAFT",
						programId,
						submittedAt,
						createdAt: now,
						updatedAt,
						program: {
							id: programId,
							name: programName,
						},
					},
				]),
			);
			return;
		}

		if (isApiPath(url, /\/api\/v1\/applications\/draft$/) && method === "POST") {
			draftCreated = true;
			updatedAt = new Date().toISOString();
			await route.fulfill(
				jsonResponse({
					id: applicationId,
					status: "DRAFT",
					createdAt: now,
				}),
			);
			return;
		}

		if (isApiPath(url, /\/api\/v1\/applications\/submit$/) && method === "POST") {
			submitted = true;
			submittedAt = new Date().toISOString();
			updatedAt = submittedAt;
			await route.fulfill(
				jsonResponse({
					id: applicationId,
					status: "SUBMITTED",
					submittedAt,
				}),
			);
			return;
		}

		if (isApiPath(url, /\/api\/v1\/applications\/[^/]+\/section$/) && method === "PUT") {
			const payload = route.request().postDataJSON() as {
				sectionKey: string;
				data: string;
			};

			if (payload.sectionKey && payload.data) {
				sectionData[payload.sectionKey] = JSON.parse(payload.data) as Record<string, unknown>;
				updatedAt = new Date().toISOString();
			}

			await route.fulfill(
				jsonResponse({
					sectionKey: payload.sectionKey,
					data: sectionData[payload.sectionKey] ?? {},
					isComplete: true,
					savedAt: updatedAt,
				}),
			);
			return;
		}

		if (isApiPath(url, /\/api\/v1\/applications\/[^/]+\/timeline$/) && method === "GET") {
			await route.fulfill(
				jsonResponse({
					data: submitted
						? [
							{
								eventType: "APPLICATION_CREATED",
								fromStatus: "DRAFT",
								toStatus: "DRAFT",
								metadata: { note: "Draft application created." },
								occurredAt: now,
							},
							{
								eventType: "APPLICATION_SUBMITTED",
								fromStatus: "DRAFT",
								toStatus: "SUBMITTED",
								metadata: { note: "Application submitted for review." },
								occurredAt: submittedAt,
							},
						]
						: [],
				}),
			);
			return;
		}

		if (isApiPath(url, /\/api\/v1\/applications\/[^/]+$/) && method === "GET") {
			await route.fulfill(jsonResponse(buildApplicationDetail()));
			return;
		}

		await route.continue();
	});
}

async function startApplicationFromPrograms(page: Page): Promise<string> {
	await page.goto("/programs");
	await expect(page.getByRole("heading", { name: "Eligible Programs" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Open" }).first()).toBeVisible();

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

async function waitForSection(page: Page, headingName: RegExp): Promise<void> {
	await expect(page.getByText("Loading section...")).toHaveCount(0, { timeout: 20_000 });
	await expect(page.getByRole("heading", { name: headingName })).toBeVisible();
}

async function completeSectionA(page: Page, programId: string): Promise<void> {
	await waitForSection(page, /Section A/i);
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
	await waitForSection(page, /Section B/i);
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
	await waitForSection(page, /Section C/i);
	await page.getByLabel("Family Status").selectOption("SINGLE_PARENT");
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
	await waitForSection(page, /Section D/i);
	await page.getByLabel("Father Monthly Income (KES)").fill("20000");
	await page.getByLabel("Mother Monthly Income (KES)").fill("12000");
	await page
		.getByPlaceholder("Describe your current hardship and why bursary support is critical this term.")
		.fill("Household income is strained by school fees for multiple dependants and rising medical costs.");
	await page.getByRole("button", { name: "Save and Continue" }).click();
	await expect(page).toHaveURL(new RegExp(`/apply/${programId}/section-e$`));
}

async function completeSectionE(page: Page, programId: string): Promise<void> {
	await waitForSection(page, /Section E/i);
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
	await waitForSection(page, /Section F/i);

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

test("@critical student can complete, submit, and export application", async ({ page }) => {
	await mockStudentApis(page);

	const programId = await startApplicationFromPrograms(page);

	await completeSectionA(page, programId);
	await completeSectionB(page, programId);
	await completeSectionC(page, programId);
	await completeSectionD(page, programId);
	await completeSectionE(page, programId);
	await completeSectionF(page, programId);

	const applicationId = await submitFromPreview(page);
	await expect(page.getByRole("heading", { name: "Current Status" })).toBeVisible();
	await expect(page.getByRole("heading", { name: "Status Timeline" })).toBeVisible();

	const previewResponsePromise = page.waitForResponse((response) => {
		return response.url().includes("/api/applications/preview/pdf") && response.request().method() === "POST";
	});
	await expect(page.getByRole("button", { name: "Download application PDF" })).toBeEnabled();
	await page.getByRole("button", { name: "Download application PDF" }).click();
	const previewResponse = await previewResponsePromise;
	expect(previewResponse.status()).toBe(200);

	const contentType = previewResponse.headers()["content-type"] ?? "";
	if (contentType.length > 0) {
		expect(contentType).toMatch(/application\/pdf|text\/html|application\/json/i);
	}

	expect(applicationId).toBe("app-e2e-1");
});
