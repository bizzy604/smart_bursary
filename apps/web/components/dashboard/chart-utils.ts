const DASHBOARD_CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function dashboardChartColor(index: number): string {
  return DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length];
}

export function compactChartLabel(value: string, maxLength = 14): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, Math.max(0, maxLength - 1))}\u2026`;
}

export function shouldUsePieChart(itemCount: number): boolean {
  return itemCount > 0 && itemCount <= 5;
}
