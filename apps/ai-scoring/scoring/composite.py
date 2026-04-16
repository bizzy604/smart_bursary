"""Composite scoring orchestration that builds final score results."""
from __future__ import annotations

from statistics import mean
from typing import Optional

from scoring.models import (
	ApplicationPayload,
	DEFAULT_WEIGHTS,
	DocumentQualityResult,
	ScoreResult,
)
from scoring.structured import StructuredScoringEngine


class CompositeScorer:
	"""Build a final score card from structured, document, and anomaly signals."""

	def __init__(self, structured_engine: StructuredScoringEngine):
		self._structured_engine = structured_engine

	def combine(
		self,
		application: ApplicationPayload,
		document_scores: dict[str, DocumentQualityResult],
		anomaly_flags: list[dict[str, object]],
		weights: Optional[dict[str, float]],
		model_version: str,
	) -> ScoreResult:
		if document_scores:
			doc_quality_score = float(mean([score.quality_score for score in document_scores.values()]))
		else:
			doc_quality_score = 5.0

		computation = self._structured_engine.calculate_total_score(
			application,
			weights=weights or DEFAULT_WEIGHTS,
			document_quality_score=doc_quality_score,
			anomaly_flags=anomaly_flags,
		)

		document_analysis = {
			doc_type: score.model_dump()
			for doc_type, score in document_scores.items()
		}

		return ScoreResult(
			application_id=application.application_id,
			county_id=application.county_id,
			total_score=computation.total_score,
			grade=computation.grade,
			dimension_scores=computation.raw_scores,
			anomaly_flags=anomaly_flags,
			document_analysis=document_analysis,
			weights_applied=computation.weights_applied,
			model_version=model_version,
		)
