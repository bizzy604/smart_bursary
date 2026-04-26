import type { ScoreDimension } from "@/lib/review-types";

interface AIScoreCardProps {
	score: number;
	grade: string;
	dimensions: ScoreDimension[];
	anomalyFlags: string[];
}

function toneByScore(score: number): string {
	if (score >= 80) {
		return "text-emerald-700";
	}

	if (score >= 60) {
		return "text-secondary";
	}

	if (score >= 40) {
		return "text-accent";
	}

	if (score >= 20) {
		return "text-amber-700";
	}

	return "text-red-700";
}

export function AIScoreCard({ score, grade, dimensions, anomalyFlags }: AIScoreCardProps) {
	const safeScore = Math.max(0, Math.min(100, score));

	return (
		<section className="space-y-4 rounded-2xl border border-secondary/30 bg-background p-5 shadow-xs">
			<div className="flex flex-wrap items-center gap-4">
				<div
					className="relative grid h-24 w-24 place-items-center rounded-full"
					style={{
						background: `conic-gradient(var(--county-primary) ${safeScore * 3.6}deg, #e5e7eb 0deg)`,
					}}
				>
					<div className="grid h-16 w-16 place-items-center rounded-full bg-background text-center">
						<p className={`text-lg font-bold ${toneByScore(safeScore)}`}>{safeScore.toFixed(1)}</p>
						<p className="-mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">/ 100</p>
					</div>
				</div>
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">AI Recommendation</p>
					<h3 className="font-serif text-xl font-semibold text-primary">{grade}</h3>
					<p className="mt-1 text-sm text-muted-foreground">Scoring is advisory only. Final decisions remain committee-driven.</p>
				</div>
			</div>

			<div className="space-y-3">
				{dimensions.map((dimension) => {
					const percent = Math.max(0, Math.min(100, (dimension.score / Math.max(1, dimension.maxScore)) * 100));

					return (
						<div key={dimension.label}>
							<div className="mb-1 flex items-center justify-between text-sm text-foreground/90">
								<span>{dimension.label}</span>
								<span className="font-semibold">{dimension.score} / {dimension.maxScore}</span>
							</div>
							<div className="h-2 overflow-hidden rounded-full bg-muted">
								<div className="h-full bg-county-primary" style={{ width: `${percent}%` }} />
							</div>
						</div>
					);
				})}
			</div>

			<div className="rounded-xl border border-border bg-muted p-3 text-sm">
				<p className="font-semibold text-foreground">Anomaly Flags</p>
				{anomalyFlags.length === 0 ? (
					<p className="mt-1 text-emerald-700">None detected.</p>
				) : (
					<ul className="mt-2 space-y-1 text-red-700">
						{anomalyFlags.map((flag) => (
							<li key={flag}>• {flag}</li>
						))}
					</ul>
				)}
			</div>
		</section>
	);
}
