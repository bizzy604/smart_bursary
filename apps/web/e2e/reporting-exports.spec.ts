import { expect, test } from "@playwright/test";

test("@critical ward and county reporting exports are accessible", async ({ page }) => {
	await page.goto("/ward/reports");
	await expect(page.getByRole("heading", { name: "Ward Report Export" })).toBeVisible();

	const wardPopupPromise = page.waitForEvent("popup");
	await page.getByRole("button", { name: "Download PDF Summary" }).click();
	const wardPopup = await wardPopupPromise;
	await wardPopup.waitForLoadState("domcontentloaded");
	await expect(wardPopup).toHaveTitle(/Ward Report/i);
	await wardPopup.close();

	const wardDownloadPromise = page.waitForEvent("download");
	await page.getByRole("button", { name: "Download Excel (CSV)" }).click();
	const wardDownload = await wardDownloadPromise;
	expect(wardDownload.suggestedFilename()).toBe("ward-report.csv");

	await page.goto("/county/reports/ocob");
	await expect(page.getByRole("heading", { name: "OCOB Report Generation" })).toBeVisible();

	const ocobPopupPromise = page.waitForEvent("popup");
	await page.getByRole("button", { name: "Download PDF Summary" }).click();
	const ocobPopup = await ocobPopupPromise;
	await ocobPopup.waitForLoadState("domcontentloaded");
	await expect(ocobPopup).toHaveTitle(/OCOB Report/i);
	await ocobPopup.close();

	const ocobDownloadPromise = page.waitForEvent("download");
	await page.getByRole("button", { name: "Download Excel (CSV)" }).click();
	const ocobDownload = await ocobDownloadPromise;
	expect(ocobDownload.suggestedFilename()).toBe("ocob-report.csv");
});
