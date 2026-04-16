"""Dependency wiring for the FastAPI scoring service."""
from functools import lru_cache

from config import Settings, get_settings as get_cached_settings
from integrations.anthropic_client import AnthropicClient
from integrations.nestjs_client import NestJsClient
from scoring.anomaly_detection import AnomalyDetector
from scoring.composite import CompositeScorer
from scoring.document_analysis import DocumentAnalyser
from scoring.pipeline import ScoringPipeline
from scoring.structured import StructuredScoringEngine


@lru_cache
def get_settings() -> Settings:
	return get_cached_settings()


@lru_cache
def get_nestjs_client() -> NestJsClient:
	settings = get_settings()
	return NestJsClient(
		base_url=settings.nestjs_base_url,
		service_key=settings.internal_service_key,
		timeout_seconds=settings.request_timeout_seconds,
	)


@lru_cache
def get_structured_engine() -> StructuredScoringEngine:
	return StructuredScoringEngine()


@lru_cache
def get_document_analyser() -> DocumentAnalyser:
	settings = get_settings()
	client = AnthropicClient(settings.anthropic_api_key, settings.anthropic_model)
	return DocumentAnalyser(client)


@lru_cache
def get_anomaly_detector() -> AnomalyDetector:
	return AnomalyDetector()


@lru_cache
def get_composite_scorer() -> CompositeScorer:
	return CompositeScorer(get_structured_engine())


@lru_cache
def get_scoring_pipeline() -> ScoringPipeline:
	return ScoringPipeline(
		nestjs_client=get_nestjs_client(),
		document_analyser=get_document_analyser(),
		anomaly_detector=get_anomaly_detector(),
		composite_scorer=get_composite_scorer(),
	)
