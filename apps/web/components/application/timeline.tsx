import { cn } from "@/lib/utils";
import { formatShortDate } from "@/lib/format";
import type { TimelineEvent } from "@/lib/student-data";

export function Timeline({ events }: { events: TimelineEvent[] }) {
	return (
		<ol className="space-y-4">
			{events.map((event, index) => (
				<li key={`${event.label}-${index}`} className="relative pl-8">
					<span
						className={cn(
							"absolute left-0 top-1.5 h-3 w-3 rounded-full border-2",
							event.status === "complete" && "border-success-700 bg-success-500",
							event.status === "current" && "border-accent-700 bg-accent-500",
							event.status === "upcoming" && "border-gray-300 bg-white",
						)}
					/>
					<div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
						<div className="flex items-center justify-between gap-3">
							<h3 className="font-semibold text-brand-900">{event.label}</h3>
							<span className="text-xs text-gray-500">{formatShortDate(event.date)}</span>
						</div>
						<p className="mt-1 text-sm text-gray-600">{event.note}</p>
					</div>
				</li>
			))}
		</ol>
	);
}

