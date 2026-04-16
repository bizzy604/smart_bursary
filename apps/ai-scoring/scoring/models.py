"""Data models and constants for scoring and API payloads."""
from __future__ import annotations

from dataclasses import dataclass, field, fields, is_dataclass
from datetime import datetime, timezone
from typing import Any, Optional

DEFAULT_WEIGHTS = {
	"family_status": 0.25,
	"family_income": 0.25,
	"education_burden": 0.20,
	"academic_standing": 0.15,
	"document_quality": 0.10,
	"integrity": 0.05,
}

MAX_RAW_SCORES = {
	"family_status": 25.0,
	"family_income": 20.0,
	"education_burden": 20.0,
	"academic_standing": 15.0,
	"document_quality": 10.0,
	"integrity": 5.0,
}


def _first(payload: dict[str, Any], *keys: str, default: Any = None) -> Any:
	for key in keys:
		if key in payload and payload[key] is not None:
			return payload[key]
	return default


def _as_float(value: Any, default: float = 0.0) -> float:
	if value is None:
		return default
	try:
		return float(value)
	except (TypeError, ValueError):
		return default


def _as_int(value: Any, default: int = 0) -> int:
	if value is None:
		return default
	try:
		return int(value)
	except (TypeError, ValueError):
		return default


def _as_bool(value: Any, default: bool = False) -> bool:
	if value is None:
		return default
	if isinstance(value, bool):
		return value
	if isinstance(value, str):
		return value.strip().lower() in {"1", "true", "yes", "on"}
	return bool(value)


def _model_dump(value: Any, json_mode: bool) -> Any:
	if isinstance(value, datetime):
		return value.isoformat() if json_mode else value
	if is_dataclass(value):
		return {field_item.name: _model_dump(getattr(value, field_item.name), json_mode) for field_item in fields(value)}
	if isinstance(value, dict):
		return {key: _model_dump(item, json_mode) for key, item in value.items()}
	if isinstance(value, list):
		return [_model_dump(item, json_mode) for item in value]
	return value


@dataclass
class ApplicationPayload:
	"""Structured application data consumed by the scoring pipeline."""

	application_id: str
	county_id: str
	program_id: str = "unknown"

	family_status: str = "BOTH_PARENTS"
	father_income_kes: float = 0.0
	mother_income_kes: float = 0.0
	guardian_income_kes: float = 0.0

	has_disability: bool = False
	parent_has_disability: bool = False
	num_siblings_in_school: int = 0

	prior_bursary_received: bool = False
	prior_bursary_source: Optional[str] = None

	father_occupation: Optional[str] = None
	mother_occupation: Optional[str] = None
	national_id: Optional[str] = None
	program_year: Optional[int] = None

	documents: dict[str, str] = field(default_factory=dict)
	document_metadata: dict[str, dict[str, Any]] = field(default_factory=dict)

	institution_type: Optional[str] = None
	year_of_study: Optional[int] = None
	hel_b_applied: bool = False

	@classmethod
	def model_validate(cls, payload: Any) -> "ApplicationPayload":
		if isinstance(payload, cls):
			return payload
		if not isinstance(payload, dict):
			raise ValueError("ApplicationPayload expects a dictionary")

		return cls(
			application_id=str(_first(payload, "application_id", "applicationId", default="")),
			county_id=str(_first(payload, "county_id", "countyId", default="")),
			program_id=str(_first(payload, "program_id", "programId", default="unknown")),
			family_status=str(_first(payload, "family_status", "familyStatus", default="BOTH_PARENTS")),
			father_income_kes=_as_float(_first(payload, "father_income_kes", "fatherIncomeKes")),
			mother_income_kes=_as_float(_first(payload, "mother_income_kes", "motherIncomeKes")),
			guardian_income_kes=_as_float(_first(payload, "guardian_income_kes", "guardianIncomeKes")),
			has_disability=_as_bool(_first(payload, "has_disability", "hasDisability")),
			parent_has_disability=_as_bool(_first(payload, "parent_has_disability", "parentHasDisability")),
			num_siblings_in_school=_as_int(_first(payload, "num_siblings_in_school", "numSiblingsInSchool")),
			prior_bursary_received=_as_bool(_first(payload, "prior_bursary_received", "priorBursaryReceived")),
			prior_bursary_source=_first(payload, "prior_bursary_source", "priorBursarySource"),
			father_occupation=_first(payload, "father_occupation", "fatherOccupation"),
			mother_occupation=_first(payload, "mother_occupation", "motherOccupation"),
			national_id=_first(payload, "national_id", "nationalId"),
			program_year=_as_int(_first(payload, "program_year", "programYear", default=0), default=0) or None,
			documents=_first(payload, "documents", default={}) or {},
			document_metadata=_first(payload, "document_metadata", "documentMetadata", default={}) or {},
			institution_type=_first(payload, "institution_type", "institutionType"),
			year_of_study=_as_int(_first(payload, "year_of_study", "yearOfStudy", default=0), default=0) or None,
			hel_b_applied=_as_bool(_first(payload, "hel_b_applied", "helb_applied", "helbApplied")),
		)

	def model_dump(self, mode: str | None = None) -> dict[str, Any]:
		return _model_dump(self, json_mode=mode == "json")


@dataclass
class DocumentQualityResult:
	"""Parsed quality analysis of a single uploaded document."""

	is_legible: Optional[bool] = None
	appears_authentic: Optional[bool] = None
	matches_declared_institution: Optional[bool] = None
	quality_score: int = 5
	flags: list[str] = field(default_factory=list)

	@classmethod
	def model_validate(cls, payload: Any) -> "DocumentQualityResult":
		if isinstance(payload, cls):
			return payload
		if not isinstance(payload, dict):
			raise ValueError("DocumentQualityResult expects a dictionary")

		score = _as_int(payload.get("quality_score"), 5)
		score = max(0, min(score, 10))

		flags = payload.get("flags", [])
		if not isinstance(flags, list):
			flags = []

		return cls(
			is_legible=payload.get("is_legible"),
			appears_authentic=payload.get("appears_authentic"),
			matches_declared_institution=payload.get("matches_declared_institution"),
			quality_score=score,
			flags=[str(flag) for flag in flags],
		)

	def model_dump(self, mode: str | None = None) -> dict[str, Any]:
		return _model_dump(self, json_mode=mode == "json")


@dataclass
class ScoreComputation:
	"""Numerical output from structured score computation."""

	raw_scores: dict[str, float]
	weighted_scores: dict[str, float]
	weights_applied: dict[str, float]
	total_score: float
	grade: str

	def model_dump(self, mode: str | None = None) -> dict[str, Any]:
		return _model_dump(self, json_mode=mode == "json")


@dataclass
class ScoreResult:
	"""External result payload returned by the scoring API."""

	application_id: str
	county_id: str
	total_score: float
	grade: str
	dimension_scores: dict[str, float]
	anomaly_flags: list[dict[str, Any]] = field(default_factory=list)
	document_analysis: dict[str, dict[str, Any]] = field(default_factory=dict)
	weights_applied: dict[str, float] = field(default_factory=lambda: dict(DEFAULT_WEIGHTS))
	model_version: str = "v1.0.0"
	scored_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

	def model_dump(self, mode: str | None = None) -> dict[str, Any]:
		return _model_dump(self, json_mode=mode == "json")

	def to_internal_payload(self) -> dict[str, Any]:
		"""Transform score result into NestJS internal ingestion payload."""
		return {
			"applicationId": self.application_id,
			"countyId": self.county_id,
			"totalScore": self.total_score,
			"anomalyFlags": self.anomaly_flags,
			"documentAnalysis": self.document_analysis,
			"weightsApplied": self.weights_applied,
			"modelVersion": self.model_version,
			"familyStatusScore": self.dimension_scores.get("family_status"),
			"familyIncomeScore": self.dimension_scores.get("family_income"),
			"educationBurdenScore": self.dimension_scores.get("education_burden"),
			"academicStandingScore": self.dimension_scores.get("academic_standing"),
			"documentQualityScore": self.dimension_scores.get("document_quality"),
			"integrityScore": self.dimension_scores.get("integrity"),
		}


@dataclass
class ScoreRequest:
	"""Request payload for POST /score."""

	application_id: str
	county_id: Optional[str] = None
	weights: Optional[dict[str, float]] = None
	application_data: Optional[ApplicationPayload] = None
	model_version: str = "v1.0.0"

	@classmethod
	def model_validate(cls, payload: Any) -> "ScoreRequest":
		if isinstance(payload, cls):
			return payload
		if not isinstance(payload, dict):
			raise ValueError("ScoreRequest expects a dictionary")

		application_data_raw = _first(payload, "application_data", "applicationData")
		application_data = (
			ApplicationPayload.model_validate(application_data_raw)
			if application_data_raw is not None
			else None
		)

		weights_raw = payload.get("weights")
		weights = None
		if isinstance(weights_raw, dict):
			weights = {str(key): _as_float(value) for key, value in weights_raw.items()}

		return cls(
			application_id=str(_first(payload, "application_id", "applicationId", default="")),
			county_id=_first(payload, "county_id", "countyId"),
			weights=weights,
			application_data=application_data,
			model_version=str(_first(payload, "model_version", "modelVersion", default="v1.0.0")),
		)

	def model_dump(self, mode: str | None = None) -> dict[str, Any]:
		return _model_dump(self, json_mode=mode == "json")


@dataclass
class WeightsValidationRequest:
	"""Request payload for POST /weights/validate."""

	weights: dict[str, float]

	@classmethod
	def model_validate(cls, payload: Any) -> "WeightsValidationRequest":
		if isinstance(payload, cls):
			return payload
		if not isinstance(payload, dict):
			raise ValueError("WeightsValidationRequest expects a dictionary")

		weights_raw = payload.get("weights", {})
		if not isinstance(weights_raw, dict):
			raise ValueError("weights must be an object")

		return cls(weights={str(key): _as_float(value) for key, value in weights_raw.items()})

	def model_dump(self, mode: str | None = None) -> dict[str, Any]:
		return _model_dump(self, json_mode=mode == "json")


@dataclass
class WeightsValidationResult:
	"""Response payload for successful weight validation."""

	valid: bool
	errors: list[str]
	normalized_weights: dict[str, float]

	def model_dump(self, mode: str | None = None) -> dict[str, Any]:
		return _model_dump(self, json_mode=mode == "json")
