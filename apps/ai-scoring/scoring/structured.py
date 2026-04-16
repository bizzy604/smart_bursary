"""Rules-based structured score engine."""
from __future__ import annotations

from typing import Optional

from scoring.models import (
	ApplicationPayload,
	DEFAULT_WEIGHTS,
	MAX_RAW_SCORES,
	ScoreComputation,
)


class StructuredScoringEngine:
	"""Deterministic scoring logic for structured application fields."""

	_required_dimensions = tuple(DEFAULT_WEIGHTS.keys())

	def validate_weights(self, weights: dict[str, float]) -> dict[str, float]:
		missing = [key for key in self._required_dimensions if key not in weights]
		if missing:
			raise ValueError(f"Missing weight dimensions: {', '.join(missing)}")

		normalized = {key: float(weights[key]) for key in self._required_dimensions}
		total = sum(normalized.values())
		if abs(total - 1.0) > 1e-6:
			raise ValueError("Weights must sum to 1.0")

		for key, value in normalized.items():
			if value < 0:
				raise ValueError(f"Weight for {key} cannot be negative")
			if value > 0.40:
				raise ValueError(f"Weight for {key} cannot exceed 0.40")

		return normalized

	def score_family_status(self, application: ApplicationPayload) -> float:
		base = {
			"ORPHAN": 25.0,
			"SINGLE_PARENT": 15.0,
			"BOTH_PARENTS": 5.0,
		}.get(application.family_status, 10.0)

		if application.has_disability or application.parent_has_disability:
			base += 5.0

		return min(base, MAX_RAW_SCORES["family_status"])

	def score_family_income(self, application: ApplicationPayload) -> float:
		annual_income = max(
			0.0,
			application.father_income_kes + application.mother_income_kes + application.guardian_income_kes,
		)
		monthly_income = annual_income / 12.0

		if monthly_income < 10_000:
			return 20.0
		if monthly_income < 30_000:
			return 12.0
		if monthly_income < 50_000:
			return 4.0
		return 0.0

	def score_education_burden(self, application: ApplicationPayload) -> float:
		dependants = max(0, int(application.num_siblings_in_school))
		return min(float(dependants * 5), MAX_RAW_SCORES["education_burden"])

	def score_academic_standing(self, application: ApplicationPayload) -> float:
		base = {
			"UNIVERSITY": 12.0,
			"COLLEGE": 10.0,
			"SECONDARY": 8.0,
		}.get((application.institution_type or "").upper(), 6.0)

		if application.year_of_study and application.year_of_study > 0:
			base += min(float(application.year_of_study), 6.0) * 0.5

		if application.hel_b_applied:
			base += 1.0

		return min(base, MAX_RAW_SCORES["academic_standing"])

	def score_integrity(
		self,
		application: ApplicationPayload,
		anomaly_flags: Optional[list[dict[str, object]]] = None,
	) -> float:
		score = MAX_RAW_SCORES["integrity"]
		if application.prior_bursary_received:
			score -= 2.5

		if anomaly_flags:
			score -= min(2.5, float(len(anomaly_flags)))

		return max(0.0, min(score, MAX_RAW_SCORES["integrity"]))

	def calculate_total_score(
		self,
		application: ApplicationPayload,
		weights: Optional[dict[str, float]] = None,
		document_quality_score: Optional[float] = None,
		anomaly_flags: Optional[list[dict[str, object]]] = None,
	) -> ScoreComputation:
		resolved_weights = self.validate_weights(weights or DEFAULT_WEIGHTS)

		raw_scores = {
			"family_status": self.score_family_status(application),
			"family_income": self.score_family_income(application),
			"education_burden": self.score_education_burden(application),
			"academic_standing": self.score_academic_standing(application),
			"document_quality": float(document_quality_score if document_quality_score is not None else 5.0),
			"integrity": self.score_integrity(application, anomaly_flags),
		}

		weighted_scores: dict[str, float] = {}
		total_score = 0.0
		for key, raw in raw_scores.items():
			max_score = MAX_RAW_SCORES[key]
			normalized = (max(0.0, min(raw, max_score)) / max_score) * 100.0
			weighted = normalized * resolved_weights[key]
			weighted_scores[key] = round(weighted, 4)
			total_score += weighted

		total_score = round(max(0.0, min(total_score, 100.0)), 2)
		grade = "HIGH" if total_score >= 80 else "MODERATE" if total_score >= 60 else "LOW"

		return ScoreComputation(
			raw_scores={key: round(value, 4) for key, value in raw_scores.items()},
			weighted_scores=weighted_scores,
			weights_applied=resolved_weights,
			total_score=total_score,
			grade=grade,
		)
