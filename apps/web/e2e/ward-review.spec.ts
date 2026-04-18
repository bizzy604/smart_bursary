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

async function mockWardReviewApis(page: Page): Promise<void> {
  const applicationId = "app-review-1";
  const reviewedAt = "2026-04-18T12:00:00.000Z";
  let wardReviewSubmitted = false;

  await page.route("**/api/v1/**", async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (isApiPath(url, /\/api\/v1\/reports\/ward-summary$/) && method === "GET") {
      await route.fulfill(
        asJson({
          generatedAt: reviewedAt,
          rows: [
            {
              applicationId,
              reference: "TRK-2026-00142",
              applicantName: "Aisha Lokiru",
              wardName: "Kalokol",
              programName: "2026 Ward Bursary Programme",
              academicYear: "2026",
              educationLevel: "UNIVERSITY",
              status: wardReviewSubmitted ? "COUNTY_REVIEW" : "WARD_REVIEW",
              aiScore: 78.5,
              wardRecommendationKes: wardReviewSubmitted ? 38000 : 0,
              countyAllocationKes: 0,
              reviewerName: "Elijah Lokwang",
              reviewerStage: wardReviewSubmitted ? "WARD_REVIEW" : "AI_SCORED",
              reviewedAt: wardReviewSubmitted ? reviewedAt : null,
            },
          ],
        }),
      );
      return;
    }

    if (isApiPath(url, /\/api\/v1\/applications\/.+\/timeline$/) && method === "GET") {
      await route.fulfill(
        asJson([
          {
            id: "evt-1",
            eventType: "APPLICATION_SUBMITTED",
            fromStatus: "SUBMITTED",
            toStatus: "WARD_REVIEW",
            metadata: { note: "Application moved to ward review." },
            occurredAt: reviewedAt,
          },
          {
            id: "evt-2",
            eventType: "WARD_REVIEW_RECOMMENDED",
            fromStatus: "WARD_REVIEW",
            toStatus: "COUNTY_REVIEW",
            metadata: { note: "Ward committee submitted recommendation." },
            occurredAt: reviewedAt,
          },
        ]),
      );
      return;
    }

    if (isApiPath(url, /\/api\/v1\/applications\/.+\/review-notes$/) && method === "GET") {
      await route.fulfill(
        asJson([
          {
            reviewId: "rev-1",
            stage: "WARD_REVIEW",
            decision: wardReviewSubmitted ? "RECOMMENDED" : "RETURNED",
            note: "High-need household profile validated by committee records.",
            recommendedAmount: wardReviewSubmitted ? 38000 : null,
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

    if (isApiPath(url, /\/api\/v1\/applications\/.+\/review\/ward$/) && method === "POST") {
      wardReviewSubmitted = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          reviewId: "rev-1",
          decision: "RECOMMENDED",
          newStatus: "COUNTY_REVIEW",
        }),
      });
      return;
    }

    if (isApiPath(url, /\/api\/v1\/documents\/application\/.+$/) && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: "doc-1", docType: "FEE_STRUCTURE", originalName: "Fee Structure.pdf", scanStatus: "CLEAN" },
          { id: "doc-2", docType: "ADMISSION_LETTER", originalName: "Admission Letter.pdf", scanStatus: "PENDING" },
        ]),
      });
      return;
    }

    await route.continue();
  });
}

test("@critical ward admin can review and recommend an application", async ({ page }) => {
  await mockWardReviewApis(page);

  await page.goto("/ward/applications");
  await expect(page.getByRole("heading", { name: "Ward Applications Queue" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Review" }).first()).toBeVisible();

  await page.getByRole("button", { name: "Review" }).first().click();
  await expect(page.getByText("Application Review")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ward Review Decision" })).toBeVisible();
  await expect(page.getByText(/^Ward Review$/)).toBeVisible();

  await page.getByLabel("Recommended Amount (KES)").fill("38000");
  await page.getByLabel("Review Note").fill("High-need household profile validated by committee records.");

  const wardDecisionRequest = page.waitForResponse((response) => {
    const path = new URL(response.url()).pathname;
    return /\/api\/v1\/applications\/.+\/review\/ward$/.test(path)
      && response.request().method() === "POST"
      && response.ok();
  });
  await page.getByRole("button", { name: "Submit Review" }).click();
  await wardDecisionRequest;
  await expect(page.getByText(/^County Review$/)).toBeVisible();

  await page.getByRole("button", { name: "Documents" }).click();
  await expect(page).toHaveURL(/\/ward\/applications\/.+\/documents$/);
  await expect(page.getByText("Document Review")).toBeVisible();
});
