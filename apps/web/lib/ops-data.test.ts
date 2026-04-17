import { describe, expect, it } from "vitest";

import { countServiceStatus, getTenantBySlug, platformServices, tenants } from "@/lib/ops-data";

describe("operations data utilities", () => {
	it("finds tenant by slug", () => {
		const first = tenants[0];
		expect(getTenantBySlug(first.slug)?.countyName).toBe(first.countyName);
	});

	it("returns null for unknown tenant slug", () => {
		expect(getTenantBySlug("unknown-county")).toBeNull();
	});

	it("counts service statuses correctly", () => {
		const degraded = platformServices.filter((service) => service.status === "degraded").length;
		expect(countServiceStatus("degraded")).toBe(degraded);
	});
});
