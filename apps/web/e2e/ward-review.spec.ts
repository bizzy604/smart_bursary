import { expect, test } from "@playwright/test";

test("@critical ward admin can review and recommend an application", async ({ page }) => {
	await page.goto("/ward/applications");
	await expect(page.getByRole("heading", { name: "Ward Applications Queue" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Review" }).first()).toBeVisible();

	await page.getByRole("button", { name: "Review" }).first().click();
	await expect(page.getByText("Application Review")).toBeVisible();
	await expect(page.getByRole("heading", { name: "Ward Review Decision" })).toBeVisible();

	await page.getByLabel("Recommended Amount (KES)").fill("38000");
	await page.getByLabel("Review Note").fill("High-need household profile validated by committee records.");
	await page.getByRole("button", { name: "Submit Review" }).click();

	await expect(
		page.getByText("Review captured in this demo flow. Backend workflow wiring will persist in a later backend-integrated phase."),
	).toBeVisible();

	await page.getByRole("button", { name: "Documents" }).click();
	await expect(page).toHaveURL(/\/ward\/applications\/.+\/documents$/);
});
