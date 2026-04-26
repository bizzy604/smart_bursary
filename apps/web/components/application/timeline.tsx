import { cn } from "@/lib/utils";
import { formatShortDate } from "@/lib/format";
import type { TimelineEvent } from "@/lib/student-types";

export function Timeline({ events }: { events: TimelineEvent[] }) {
	return (
		<ol className="space-y-4">
			{events.map((event, index) => (
				<li key={`${event.label}-${index}`} className="relative pl-8">
					<span
						className={cn(
							"absolute left-0 top-1.5 h-3 w-3 rounded-full border-2",
							event.status === "complete" && "border-emerald-700 bg-emerald-500",
							event.status === "current" && "border-accent bg-accent",
							event.status === "upcoming" && "border-border bg-background",
						)}
					/>
					<div className="rounded-lg border border-border bg-background p-4 shadow-xs">
						<div className="flex items-center justify-between gap-3">
							<h3 className="font-semibold text-primary">{event.label}</h3>
							<span className="text-xs text-muted-foreground">{formatShortDate(event.date)}</span>
						</div>
						<p className="mt-1 text-sm text-muted-foreground">{event.note}</p>
					</div>
				</li>
			))}
		</ol>
	);
}

