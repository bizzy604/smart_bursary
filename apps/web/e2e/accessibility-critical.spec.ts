import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

type AxeViolation = {
	id: string;
	help: string;
	impact?: string | null;
	nodes: Array<{ target: string[] }>;
};

const criticalRoutes = [
	"/apply/prog-ward-2024/section-a",
	"/ward/applications",
	"/ward/applications/app-00142",
	"/county/review",
	"/county/review/app-00170",
	"/ward/reports",
	"/county/reports/ocob",
];

function blockingViolations(violations: AxeViolation[]): AxeViolation[] {
	return violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
}

function formatViolations(route: string, violations: AxeViolation[]): string {
	if (violations.length === 0) {
		return `${route}: no serious or critical accessibility violations.`;
	}

	const details = violations
		.map((violation) => {
			const targets = violation.nodes.map((node) => node.target.join(" ")).join(" | ");
			return `${violation.id} (${violation.impact ?? "unknown"}): ${violation.help} :: ${targets}`;
		})
		.join("\n");

	return `${route} has serious/critical accessibility findings:\n${details}`;
}

test.describe("@a11y critical flow accessibility baseline", () => {
	for (const route of criticalRoutes) {
		test(`@a11y ${route} has no serious or critical violations`, async ({ page }) => {
			await page.goto(route);
			await page.waitForLoadState("domcontentloaded");

			const results = await new AxeBuilder({ page }).analyze();
			const blocking = blockingViolations(results.violations as AxeViolation[]);

			expect(blocking, formatViolations(route, blocking)).toEqual([]);
		});
	}
});
