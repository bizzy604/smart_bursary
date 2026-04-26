import Link from "next/link";
import { StatusBadge } from "@/components/application/status-badge";
import { Button } from "@/components/ui/button";
import { formatCurrencyKes, formatShortDate } from "@/lib/format";
import type { StudentApplicationSummary } from "@/lib/student-types";

interface ApplicationCardProps {
	application: StudentApplicationSummary;
}

export function ApplicationCard({ application }: ApplicationCardProps) {
	return (
		<article className="rounded-xl border border-border bg-background p-5 shadow-xs">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="space-y-1">
					<p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">{application.reference}</p>
					<h3 className="font-serif text-lg font-semibold text-primary">{application.programName}</h3>
					<p className="text-sm text-muted-foreground">Requested: {formatCurrencyKes(application.requestedKes)}</p>
				</div>
				<StatusBadge status={application.status} />
			</div>

			<div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
				<p className="text-xs text-muted-foreground">Updated {formatShortDate(application.updatedAt)}</p>
				<div className="flex gap-2">
					{application.status === "DRAFT" ? (
						<Link href={`/apply/${application.programId}`}>
							<Button size="sm">Continue Draft</Button>
						</Link>
					) : null}
					<Link href={`/applications/${application.id}`}>
						<Button variant="outline" size="sm">
							View details
						</Button>
					</Link>
				</div>
			</div>
		</article>
	);
}

