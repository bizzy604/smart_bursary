import { expect, type Page, test } from "@playwright/test";

function asJson(data: unknown): { status: number; contentType: string; body: string } {
  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(data),
  };
}

function isApiPath(url: string, pattern: RegExp): boolean {
  return pattern.test(new URL(url).pathname);
}

async function mockOpsApis(page: Page): Promise<void> {
  const now = "2026-04-18T14:20:00.000Z";

  await page.route("**/api/v1/**", async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (isApiPath(url, /\/api\/v1\/platform\/tenants$/) && method === "GET") {
      await route.fulfill(
        asJson({
          data: [
            {
              id: "county-1",
              slug: "turkana",
              name: "Turkana County",
              planTier: "ENTERPRISE",
              isActive: true,
              wardCount: 30,
              userCount: 421,
              createdAt: now,
            },
            {
              id: "county-2",
              slug: "kisumu",
              name: "Kisumu County",
              planTier: "STANDARD",
              isActive: false,
              wardCount: 25,
              userCount: 123,
              createdAt: now,
            },
          ],
        }),
      );
      return;
    }

    if (isApiPath(url, /\/api\/v1\/platform\/tenants\/status$/) && method === "GET") {
      await route.fulfill(
        asJson({
          ready: true,
          message: "Tenant provisioning workflows are active.",
          defaults: {
            nationalWardSeedSize: 1450,
            defaultPlanTier: "BASIC",
          },
        }),
      );
      return;
    }

    if (isApiPath(url, /\/api\/v1\/platform\/tenants\/county-1$/) && method === "GET") {
      await route.fulfill(
        asJson({
          data: {
            id: "county-1",
            slug: "turkana",
            name: "Turkana County",
            fundName: "Turkana County Education Fund",
            legalReference: "County Gazette Notice 12/2026",
            planTier: "ENTERPRISE",
            primaryColor: "#1E3A5F",
            isActive: true,
            wardCount: 30,
            userCount: 421,
            createdAt: now,
            updatedAt: now,
          },
        }),
      );
      return;
    }

    if (isApiPath(url, /\/api\/v1\/health$/) && method === "GET") {
      await route.fulfill(
        asJson({
          status: "ok",
          service: "api",
          timestamp: now,
        }),
      );
      return;
    }

    await route.continue();
  });
}

test("@critical ops tenant registry renders from tenant provisioning APIs", async ({ page }) => {
  await mockOpsApis(page);

  await page.goto("/tenants");
  await expect(page.getByRole("heading", { name: "Tenant Registry" })).toBeVisible();
  await expect(page.getByText("Turkana County")).toBeVisible();
  await expect(page.getByText("Plan ENTERPRISE")).toBeVisible();

  await page.getByRole("button", { name: "Open Tenant Detail" }).first().click();
  await expect(page).toHaveURL("/tenants/turkana");
  await expect(page.getByRole("heading", { name: "Turkana County" })).toBeVisible();
  await expect(page.getByText("Tenant Configuration")).toBeVisible();
  await expect(page.getByText("County Gazette Notice 12/2026")).toBeVisible();
});

test("@critical ops health dashboard renders live platform status", async ({ page }) => {
  await mockOpsApis(page);

  await page.goto("/health");
  await expect(page.getByRole("heading", { name: "System Health Dashboard" })).toBeVisible();
  await expect(page.getByText("Service Status")).toBeVisible();
  await expect(page.getByRole("article").filter({ hasText: "API Gateway" })).toBeVisible();
  await expect(page.getByRole("article").filter({ hasText: "Tenant Provisioning" })).toBeVisible();
  await expect(page.getByRole("article").filter({ hasText: "Tenant Registry" })).toBeVisible();
});
