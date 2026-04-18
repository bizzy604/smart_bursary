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

	await page.goto("/programs", { waitUntil: "domcontentloaded" });
	await expect(page.getByRole("heading", { name: "Eligible Programs" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Open" }).first()).toBeVisible();
	await page.getByRole("button", { name: "Open" }).first().click();
	await expect(page.getByRole("button", { name: "Apply Now" })).toBeVisible();

	await page.goto("/ward/applications", { waitUntil: "domcontentloaded" });
	await expect(page.getByRole("heading", { name: "Ward Applications Queue" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Review" }).first()).toBeVisible();
});
