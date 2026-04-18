import type { ScoreDimension } from "@/lib/review-types";

interface AIScoreCardProps {
	score: number;
	grade: string;
	dimensions: ScoreDimension[];
	anomalyFlags: string[];
}

function toneByScore(score: number): string {
	if (score >= 80) {
		return "text-success-700";
	}

	if (score >= 60) {
		return "text-brand-700";
	}

	if (score >= 40) {
		return "text-accent-700";
	}

	if (score >= 20) {
		return "text-warning-700";
	}

	return "text-danger-700";
}

export function AIScoreCard({ score, grade, dimensions, anomalyFlags }: AIScoreCardProps) {
	const safeScore = Math.max(0, Math.min(100, score));

	return (
		<section className="space-y-4 rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
			<div className="flex flex-wrap items-center gap-4">
				<div
					className="relative grid h-24 w-24 place-items-center rounded-full"
					style={{
						background: `conic-gradient(var(--county-primary) ${safeScore * 3.6}deg, #e5e7eb 0deg)`,
					}}
				>
					<div className="grid h-16 w-16 place-items-center rounded-full bg-white text-center">
						<p className={`text-lg font-bold ${toneByScore(safeScore)}`}>{safeScore.toFixed(1)}</p>
						<p className="-mt-1 text-[10px] uppercase tracking-wide text-gray-500">/ 100</p>
					</div>
				</div>
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">AI Recommendation</p>
					<h3 className="font-display text-xl font-semibold text-brand-900">{grade}</h3>
					<p className="mt-1 text-sm text-gray-600">Scoring is advisory only. Final decisions remain committee-driven.</p>
				</div>
			</div>

			<div className="space-y-3">
				{dimensions.map((dimension) => {
					const percent = Math.max(0, Math.min(100, (dimension.score / Math.max(1, dimension.maxScore)) * 100));

					return (
						<div key={dimension.label}>
							<div className="mb-1 flex items-center justify-between text-sm text-gray-700">
								<span>{dimension.label}</span>
								<span className="font-semibold">{dimension.score} / {dimension.maxScore}</span>
							</div>
							<div className="h-2 overflow-hidden rounded-full bg-gray-200">
								<div className="h-full bg-county-primary" style={{ width: `${percent}%` }} />
							</div>
						</div>
					);
				})}
			</div>

			<div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm">
				<p className="font-semibold text-gray-800">Anomaly Flags</p>
				{anomalyFlags.length === 0 ? (
					<p className="mt-1 text-success-700">None detected.</p>
				) : (
					<ul className="mt-2 space-y-1 text-danger-700">
						{anomalyFlags.map((flag) => (
							<li key={flag}>• {flag}</li>
						))}
					</ul>
				)}
			</div>
		</section>
	);
}
