import { expect, type Page, test } from "@playwright/test";

function asJson(data: unknown): { status: number; contentType: string; body: string } {
  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data }),
  };
}

function isApiPath(url: string, pattern: RegExp): boolean {
  return pattern.test(new URL(url).pathname);
}

async function mockCountyApis(page: Page): Promise<void> {
  const applicationId = "app-county-1";
  const reviewedAt = "2026-04-18T12:30:00.000Z";
  let countyDecisionSubmitted = false;

  await page.route("**/api/v1/**", async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (isApiPath(url, /\/api\/v1\/reports\/dashboard$/) && method === "GET") {
      await route.fulfill(
        asJson({
          generatedAt: reviewedAt,
          totalApplications: 1,
          approvedApplications: countyDecisionSubmitted ? 1 : 0,
          disbursedCount: 0,
          programs: [
            {
              id: "prog-1",
              name: "2026 County Bursary",
              budget_ceiling: 2500000,
              allocated_total: countyDecisionSubmitted ? 42000 : 0,
              disbursed_total: 0,
            },
          ],
          ward_breakdown: [
            {
              ward_id: "ward-1",
              ward_name: "Kalokol",
              applications: 1,
              approved: countyDecisionSubmitted ? 1 : 0,
              allocated_kes: countyDecisionSubmitted ? 42000 : 0,
            },
          ],
        }),
      );
      return;
    }

    if (isApiPath(url, /\/api\/v1\/reports\/ward-summary$/) && method === "GET") {
      await route.fulfill(
        asJson({
          generatedAt: reviewedAt,
          rows: [
            {
              applicationId,
              reference: "TRK-2026-00402",
              applicantName: "Musa Lomuria",
              wardName: "Kalokol",
              programName: "2026 County Bursary",
              academicYear: "2026",
              educationLevel: "UNIVERSITY",
              status: countyDecisionSubmitted ? "APPROVED" : "COUNTY_REVIEW",
              aiScore: 81.4,
              wardRecommendationKes: 40000,
              countyAllocationKes: countyDecisionSubmitted ? 42000 : 0,
              reviewerName: countyDecisionSubmitted ? "County Finance Officer" : "Ward Committee",
              reviewerStage: countyDecisionSubmitted ? "COUNTY_REVIEW" : "WARD_REVIEW",
              reviewedAt,
            },
          ],
        }),
      );
      return;
    }

    if (isApiPath(url, /\/api\/v1\/applications\/.+\/score$/) && method === "GET") {
      await route.fulfill(
        asJson({
          totalScore: 81.4,
          grade: "A",
          confidenceLevel: "HIGH",
          dimensions: [
            { key: "need", label: "Need", score: 84, rationale: "Income profile within hardship threshold." },
            { key: "merit", label: "Merit", score: 79, rationale: "Strong continuity and attendance record." },
          ],
        }),
      );
      return;
    }

    if (isApiPath(url, /\/api\/v1\/applications\/.+\/review-notes$/) && method === "GET") {
      await route.fulfill(
        asJson([
          {
            reviewId: "county-note-1",
            stage: "WARD_REVIEW",
            decision: "RECOMMENDED",
            note: "Ward committee recommended KES 40,000.",
            recommendedAmount: 40000,
            allocatedAmount: null,
            reviewedAt,
            reviewer: {
              fullName: "Elijah Lokwang",
              email: "elijah@example.com",
            },
          },
        ]),
      );
      return;
    }

    if (isApiPath(url, /\/api\/v1\/documents\/application\/.+$/) && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: "doc-1", docType: "FEE_STRUCTURE", originalName: "Fee Structure.pdf", scanStatus: "CLEAN" },
          { id: "doc-2", docType: "ID_COPY", originalName: "Guardian ID.pdf", scanStatus: "CLEAN" },
        ]),
      });
      return;
    }

    if (isApiPath(url, /\/api\/v1\/applications\/.+\/review\/county$/) && method === "POST") {
      countyDecisionSubmitted = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          reviewId: "county-review-1",
          decision: "APPROVED",
          newStatus: "APPROVED",
          allocatedAmount: 42000,
        }),
      });
      return;
    }

    await route.continue();
  });
}

test("@critical county finance officer finalizes allocation and prepares disbursement batch", async ({ page }) => {
  await mockCountyApis(page);

  await page.goto("/county/review");
  await expect(page.getByRole("heading", { name: "County Review Queue" })).toBeVisible();
  await expect(page.getByText("TRK-2026-00402")).toBeVisible();

  await page.getByRole("button", { name: "Final Review" }).first().click();
  await expect(page.getByText("Final Allocation Review")).toBeVisible();
  await expect(page.getByRole("heading", { name: "County Final Decision" })).toBeVisible();
  await expect(page.getByText(/^County Review$/)).toBeVisible();

  await page.getByLabel("Recommended Amount (KES)").fill("42000");
  await page.getByLabel("Review Note").fill("Approved with KES 42,000 based on county balancing guidance.");

  const countyDecisionRequest = page.waitForResponse((response) => {
    const path = new URL(response.url()).pathname;
    return /\/api\/v1\/applications\/.+\/review\/county$/.test(path)
      && response.request().method() === "POST"
      && response.ok();
  });
  await page.getByRole("button", { name: "Submit Review" }).click();
  await countyDecisionRequest;
  await expect(page.getByText(/^Approved$/)).toBeVisible();

  await page.goto("/county/disbursements");
  await expect(page.getByRole("heading", { name: "Disbursement Queue" })).toBeVisible();
  await expect(page.getByText("TRK-2026-00402")).toBeVisible();
  await expect(page.getByRole("button", { name: "Export EFT Batch" })).toBeVisible();

  await page.getByRole("button", { name: "Export EFT Batch" }).click();
  await expect(page).toHaveURL("/county/disbursements/batch");
  await expect(page.getByRole("heading", { name: "EFT Batch Export" })).toBeVisible();
  await expect(page.getByText("TRK-2026-00402")).toBeVisible();
});
