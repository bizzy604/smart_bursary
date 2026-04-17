const kenyaCurrencyFormatter = new Intl.NumberFormat("en-KE", {
	style: "currency",
	currency: "KES",
	maximumFractionDigits: 0,
});

const shortDateFormatter = new Intl.DateTimeFormat("en-KE", {
	day: "2-digit",
	month: "short",
	year: "numeric",
});

export function formatCurrencyKes(value: number): string {
	return kenyaCurrencyFormatter.format(value);
}

export function formatShortDate(dateIso: string): string {
	if (dateIso === "Pending") {
		return dateIso;
	}

	const parsed = new Date(dateIso);
	if (Number.isNaN(parsed.getTime())) {
		return dateIso;
	}

	return shortDateFormatter.format(parsed);
}

export function formatPercent(value: number): string {
	return `${Math.round(value)}%`;
}

