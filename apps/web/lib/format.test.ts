import { describe, expect, it } from "vitest";

import { formatCurrencyKes, formatPercent, formatShortDate } from "@/lib/format";

describe("format utilities", () => {
	it("formats currency with Kenyan locale separators", () => {
		const result = formatCurrencyKes(1234567);
		expect(result).toContain("1,234,567");
	});

	it("returns pending label unchanged", () => {
		expect(formatShortDate("Pending")).toBe("Pending");
	});

	it("returns the original value for invalid date input", () => {
		expect(formatShortDate("not-a-date")).toBe("not-a-date");
	});

	it("rounds percentages to nearest integer", () => {
		expect(formatPercent(82.6)).toBe("83%");
	});
});
