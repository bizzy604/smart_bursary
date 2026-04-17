import { expect, test } from "@playwright/test";

test("@critical county finance can complete final allocation flow", async ({ page }) => {
	await page.goto("/county/review");
	await expect(page.getByRole("heading", { name: "County Review Queue" })).toBeVisible();

	await page.getByRole("button", { name: "Final Review" }).first().click();
	await expect(page.getByText("Final Allocation Review")).toBeVisible();

	await page.getByRole("radio", { name: "Approve Allocation" }).check();
	await page.getByLabel("Recommended Amount (KES)").fill("36000");
	await page.getByLabel("Review Note").fill("Allocation approved within outstanding-fee cap for this cycle.");
	await page.getByRole("button", { name: "Submit Review" }).click();

	await expect(
		page.getByText("Review captured in this demo flow. Backend workflow wiring will persist in a later backend-integrated phase."),
	).toBeVisible();

	await page.goto("/county/disbursements");
	await expect(page.getByRole("heading", { name: "Disbursement Queue" })).toBeVisible();
	await page.getByRole("button", { name: "Export EFT Batch" }).click();

	await expect(page).toHaveURL("/county/disbursements/batch");
	await expect(page.getByRole("heading", { name: "EFT Batch Export" })).toBeVisible();
	await expect(page.locator("tbody tr").first()).toBeVisible();
});
