"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrencyKes } from "@/lib/format";

type ReviewMode = "ward" | "county";

interface ReviewPanelProps {
	mode: ReviewMode;
	maxAmountKes: number;
	defaultAmountKes: number;
	existingNote?: string;
	onSubmit?: (payload: {
		decision: string;
		recommendedAmount: number;
		note: string;
	}) => Promise<string | void>;
}

const decisionOptions: Record<ReviewMode, Array<{ value: string; label: string }>> = {
	ward: [
		{ value: "recommend", label: "Recommend for County Review" },
		{ value: "return", label: "Return to Applicant" },
		{ value: "reject", label: "Reject" },
	],
	county: [
		{ value: "approve", label: "Approve Allocation" },
		{ value: "waitlist", label: "Waitlist" },
		{ value: "reject", label: "Reject" },
	],
};

export function ReviewPanel({
	mode,
	maxAmountKes,
	defaultAmountKes,
	existingNote,
	onSubmit,
}: ReviewPanelProps) {
	const [decision, setDecision] = useState(decisionOptions[mode][0]?.value ?? "");
	const [recommendedAmount, setRecommendedAmount] = useState(String(defaultAmountKes));
	const [reviewNote, setReviewNote] = useState(existingNote ?? "");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [feedback, setFeedback] = useState<string | null>(null);

	const amount = Number(recommendedAmount || 0);
	const decisionNeedsAmount =
		(mode === "ward" && decision === "recommend") ||
		(mode === "county" && decision === "approve");
	const amountIsValid = !decisionNeedsAmount || (amount > 0 && amount <= maxAmountKes);

	return (
		<section className="space-y-4 rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
			<div>
				<h3 className="font-display text-lg font-semibold text-brand-900">
					{mode === "ward" ? "Ward Review Decision" : "County Final Decision"}
				</h3>
				<p className="mt-1 text-sm text-gray-600">Maximum allowed by program rules: {formatCurrencyKes(maxAmountKes)}</p>
			</div>

			<div className="space-y-2 text-sm text-gray-700">
				{decisionOptions[mode].map((option) => (
					<label key={option.value} className="flex items-start gap-2">
						<input
							type="radio"
							name={`review-${mode}`}
							checked={decision === option.value}
							onChange={() => setDecision(option.value)}
							className="mt-0.5 h-4 w-4 border-gray-300"
						/>
						<span>{option.label}</span>
					</label>
				))}
			</div>

			<div className="space-y-1">
				<label htmlFor={`${mode}-recommended-amount`} className="text-sm font-medium text-gray-700">
					Recommended Amount (KES)
				</label>
				<Input
					id={`${mode}-recommended-amount`}
					type="number"
					value={recommendedAmount}
					onChange={(event) => setRecommendedAmount(event.target.value)}
				/>
				{!amountIsValid ? (
					<p className="text-xs text-danger-700">Enter an amount between 1 and {formatCurrencyKes(maxAmountKes)}.</p>
				) : null}
			</div>

			<div className="space-y-1">
				<label htmlFor={`${mode}-review-note`} className="text-sm font-medium text-gray-700">
					Review Note
				</label>
				<textarea
					id={`${mode}-review-note`}
					value={reviewNote}
					onChange={(event) => setReviewNote(event.target.value)}
					className="min-h-[110px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-xs transition-colors placeholder:text-gray-400 focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-100"
					placeholder="Capture committee rationale for audit and timeline history."
				/>
			</div>

			<div className="flex flex-wrap items-center gap-3">
				<Button
					disabled={isSubmitting}
					onClick={async () => {
						if (!amountIsValid) {
							setFeedback("Correct the recommended amount before submitting.");
							return;
						}

						if (!onSubmit) {
							setFeedback("Review captured in this demo flow. Backend workflow wiring will persist in a later backend-integrated phase.");
							return;
						}

						setIsSubmitting(true);
						setFeedback(null);
						try {
							const customMessage = await onSubmit({
								decision,
								recommendedAmount: amount,
								note: reviewNote,
							});
							setFeedback(customMessage ?? "Review decision submitted successfully.");
						} catch (reason: unknown) {
							const message = reason instanceof Error ? reason.message : "Failed to submit review decision.";
							setFeedback(message);
						} finally {
							setIsSubmitting(false);
						}
					}}
				>
					{isSubmitting ? "Submitting..." : "Submit Review"}
				</Button>
				{feedback ? <p className="text-xs text-info-700">{feedback}</p> : null}
			</div>
		</section>
	);
}
