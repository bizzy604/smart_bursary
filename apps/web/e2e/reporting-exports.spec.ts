import { expect, type Page, test } from "@playwright/test";

function asJson(data: unknown): { status: number; contentType: string; body: string } {
	return {
		status: 200,
		contentType: "application/json",
		body: JSON.stringify({ data }),
	};
}

async function mockReportingApis(page: Page): Promise<void> {
	const generatedAt = "2026-04-18T10:00:00.000Z";

	await page.route("**/api/v1/reports/ward-summary/export**", async (route) => {
		const format = new URL(route.request().url()).searchParams.get("format") ?? "csv";
		if (format === "pdf") {
			await route.fulfill({
				status: 200,
				headers: {
					"content-type": "application/pdf",
					"content-disposition": 'attachment; filename="ward-summary-report.pdf"',
				},
				body: "%PDF-1.4\n% Ward summary report\n",
			});
			return;
		}

		await route.fulfill({
			status: 200,
			headers: {
				"content-type": "text/csv",
				"content-disposition": 'attachment; filename="ward-summary-report.csv"',
			},
			body: "reference,applicant\\nTRK-2026-00142,Aisha Lokiru\\n",
		});
	});

	await page.route("**/api/v1/reports/ocob/export**", async (route) => {
		const format = new URL(route.request().url()).searchParams.get("format") ?? "csv";
		if (format === "pdf") {
			await route.fulfill({
				status: 200,
				headers: {
					"content-type": "application/pdf",
					"content-disposition": 'attachment; filename="ocob-report.pdf"',
				},
				body: "%PDF-1.4\n% OCOB report\n",
			});
			return;
		}

		await route.fulfill({
			status: 200,
			headers: {
				"content-type": "text/csv",
				"content-disposition": 'attachment; filename="ocob-report.csv"',
			},
			body: "program,allocated\\n2026 Ward Bursary Programme,55000\\n",
		});
	});

	await page.route("**/api/v1/reports/dashboard**", async (route) => {
		await route.fulfill(
			asJson({
				totalApplications: 24,
				approvedApplications: 10,
				rejectedApplications: 4,
				disbursedCount: 7,
				approvalRate: 41.6,
				as_of: generatedAt,
				programs: [{
					id: "prog-ward-2024",
					name: "2026 Ward Bursary Programme",
					budget_ceiling: 5000000,
					allocated_total: 2150000,
					disbursed_total: 1800000,
					utilization_pct: 43,
					applications_by_status: { WARD_REVIEW: 7, COUNTY_REVIEW: 3, APPROVED: 10 },
				}],
				ward_breakdown: [{ ward_id: "ward-kalokol", ward_name: "Kalokol", applications: 9, approved: 4, allocated_kes: 690000 }],
			}),
		);
	});

	await page.route("**/api/v1/reports/ward-summary**", async (route) => {
		await route.fulfill(
			asJson({
				generatedAt,
				rows: [{
					applicationId: "app-00142",
					programId: "prog-ward-2024",
					wardId: "ward-kalokol",
					reference: "TRK-2026-00142",
					applicantName: "Aisha Lokiru",
					wardName: "Kalokol",
					programName: "2026 Ward Bursary Programme",
					academicYear: "2026",
					educationLevel: "UNIVERSITY",
					status: "COUNTY_REVIEW",
					aiScore: 78.5,
					wardRecommendationKes: 40000,
					countyAllocationKes: 0,
					reviewerName: "Elijah Lokwang",
					reviewerStage: "WARD",
					reviewedAt: generatedAt,
				}],
			}),
		);
	});

	await page.route("**/api/v1/reports/ocob**", async (route) => {
		await route.fulfill(
			asJson({
				generatedAt,
				rows: [{
					programId: "prog-ward-2024",
					programName: "2026 Ward Bursary Programme",
					academicYear: "2026",
					budgetCeilingKes: 5000000,
					applications: 24,
					approved: 10,
					allocatedKes: 2150000,
					disbursedKes: 1800000,
					balanceKes: 2850000,
				}],
			}),
		);
	});
}

test("@critical ward and county reporting exports are accessible", async ({ page }) => {
	await mockReportingApis(page);

	await page.goto("/ward/reports");
	await expect(page.getByRole("heading", { name: "Ward Report Export" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Download PDF Summary" })).toBeEnabled();
	await expect(page.getByRole("button", { name: "Download Excel (CSV)" })).toBeEnabled();

	const wardPdfPromise = page.waitForEvent("download");
	await page.getByRole("button", { name: "Download PDF Summary" }).click();
	const wardPdfDownload = await wardPdfPromise;
	expect(wardPdfDownload.suggestedFilename()).toBe("ward-summary-report.pdf");

	const wardCsvPromise = page.waitForEvent("download");
	await page.getByRole("button", { name: "Download Excel (CSV)" }).click();
	const wardCsvDownload = await wardCsvPromise;
	expect(wardCsvDownload.suggestedFilename()).toBe("ward-summary-report.csv");

	await page.goto("/county/reports/ocob");
	await expect(page.getByRole("heading", { name: "OCOB Report Generation" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Download PDF Summary" })).toBeEnabled();
	await expect(page.getByRole("button", { name: "Download Excel (CSV)" })).toBeEnabled();

	const ocobPdfPromise = page.waitForEvent("download");
	await page.getByRole("button", { name: "Download PDF Summary" }).click();
	const ocobPdfDownload = await ocobPdfPromise;
	expect(ocobPdfDownload.suggestedFilename()).toBe("ocob-report.pdf");

	const ocobCsvPromise = page.waitForEvent("download");
	await page.getByRole("button", { name: "Download Excel (CSV)" }).click();
	const ocobCsvDownload = await ocobCsvPromise;
	expect(ocobCsvDownload.suggestedFilename()).toBe("ocob-report.csv");
});
