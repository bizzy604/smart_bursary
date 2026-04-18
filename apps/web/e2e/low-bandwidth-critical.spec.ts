import { expect, test } from "@playwright/test";

test("@critical low-bandwidth mode keeps key journeys usable", async ({ page }) => {
	await page.route("**/*", async (route) => {
		const resourceType = route.request().resourceType();
		if (resourceType === "image" || resourceType === "font" || resourceType === "media") {
			await route.abort();
			return;
		}
		await route.continue();
	});

	await page.route("**/api/v1/**", async (route) => {
		const url = route.request().url();
		const method = route.request().method();
		const pathname = new URL(url).pathname;

		if (pathname === "/api/v1/programs" && method === "GET") {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([
					{
						id: "prog-low-bandwidth-1",
						name: "2026 County Bursary Intake",
						description: "County bursary support for 2026 intake.",
						budgetCeiling: 600000,
						allocatedTotal: 150000,
						closesAt: "2026-06-30T17:00:00.000Z",
						eligible: true,
						wardId: null,
						eligibilityRules: [],
					},
				]),
			});
			return;
		}

		if (pathname === "/api/v1/applications/my-applications" && method === "GET") {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([]),
			});
			return;
		}

		if (pathname === "/api/v1/reports/ward-summary" && method === "GET") {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					data: {
						generatedAt: "2026-04-19T00:00:00.000Z",
						rows: [
							{
								applicationId: "app-low-bandwidth-1",
								reference: "TRK-2026-00990",
								applicantName: "Aisha Lokiru",
								wardName: "Kalokol",
								programName: "2026 County Bursary Intake",
								academicYear: "2026",
								educationLevel: "UNIVERSITY",
								status: "WARD_REVIEW",
								aiScore: 77.2,
								wardRecommendationKes: 0,
								countyAllocationKes: 0,
								reviewerName: "Elijah Lokwang",
								reviewerStage: "AI_SCORED",
								reviewedAt: null,
							},
						],
					},
				}),
			});
			return;
		}

		await route.continue();
	});

	await page.goto("/programs", { waitUntil: "domcontentloaded" });
	await expect(page.getByRole("heading", { name: "Eligible Programs" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Open" }).first()).toBeVisible();
	await page.getByRole("button", { name: "Open" }).first().click();
	await expect(page.getByRole("button", { name: "Apply Now" })).toBeVisible();

	await page.goto("/ward/applications", { waitUntil: "domcontentloaded" });
	await expect(page.getByRole("heading", { name: "Ward Applications Queue" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Review" }).first()).toBeVisible();
});
