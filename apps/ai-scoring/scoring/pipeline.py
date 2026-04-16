"""End-to-end scoring pipeline orchestration."""
from __future__ import annotations

from typing import Any

from scoring.anomaly_detection import AnomalyDetector
from scoring.composite import CompositeScorer
from scoring.document_analysis import DocumentAnalyser
from scoring.models import ApplicationPayload, ScoreRequest, ScoreResult


class ScoringPipeline:
	"""Fetch application data, score it, persist it, and cache results."""

	def __init__(
		self,
		nestjs_client: Any,
		document_analyser: DocumentAnalyser,
		anomaly_detector: AnomalyDetector,
		composite_scorer: CompositeScorer,
	):
		self._nestjs_client = nestjs_client
		self._document_analyser = document_analyser
		self._anomaly_detector = anomaly_detector
		self._composite_scorer = composite_scorer
		self._score_cache: dict[str, ScoreResult] = {}

	async def score(self, request: ScoreRequest) -> ScoreResult:
		application = request.application_data
		if application is None:
			fetched = await self._nestjs_client.fetch_application_data(request.application_id)
			application = ApplicationPayload.model_validate(fetched)

		if request.county_id and application.county_id != request.county_id:
			raise ValueError("Request county_id does not match application county_id")

		anomaly_flags = self._anomaly_detector.detect(application)

		document_scores = {
			doc_type: self._document_analyser.analyse(url, doc_type)
			for doc_type, url in application.documents.items()
		}

		result = self._composite_scorer.combine(
			application=application,
			document_scores=document_scores,
			anomaly_flags=anomaly_flags,
			weights=request.weights,
			model_version=request.model_version,
		)

		self._score_cache[application.application_id] = result
		await self._nestjs_client.submit_score(result.to_internal_payload())
		return result

	def get_cached_score(self, application_id: str) -> ScoreResult | None:
		return self._score_cache.get(application_id)
