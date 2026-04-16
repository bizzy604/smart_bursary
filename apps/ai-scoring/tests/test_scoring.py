from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from scoring.anomaly_detection import AnomalyDetector
from scoring.models import ApplicationPayload, DEFAULT_WEIGHTS
from scoring.structured import StructuredScoringEngine


def application_fixture(**overrides) -> ApplicationPayload:
	base = {
		"application_id": "app-001",
		"county_id": "county-001",
		"program_id": "prog-2024",
		"family_status": "BOTH_PARENTS",
		"father_income_kes": 120_000,
		"mother_income_kes": 60_000,
		"guardian_income_kes": 0,
		"num_siblings_in_school": 1,
		"has_disability": False,
		"parent_has_disability": False,
		"prior_bursary_received": False,
		"documents": {
			"FEE_STRUCTURE": "https://example.com/fee.pdf",
			"TRANSCRIPT": "https://example.com/transcript.pdf",
		},
		"institution_type": "UNIVERSITY",
		"year_of_study": 2,
	}
	base.update(overrides)
	return ApplicationPayload.model_validate(base)


@pytest.fixture
def scoring_engine() -> StructuredScoringEngine:
	return StructuredScoringEngine()


@pytest.fixture
def anomaly_detector() -> AnomalyDetector:
	return AnomalyDetector()


class TestStructuredScoring:
	def test_disability_flag_adds_bonus_points(self, scoring_engine: StructuredScoringEngine) -> None:
		app_no_disability = application_fixture(has_disability=False)
		app_with_disability = application_fixture(has_disability=True)

		score_no = scoring_engine.score_family_status(app_no_disability)
		score_yes = scoring_engine.score_family_status(app_with_disability)

		assert score_yes > score_no

	def test_income_brackets_assign_expected_scores(self, scoring_engine: StructuredScoringEngine) -> None:
		very_low = application_fixture(father_income_kes=0, mother_income_kes=0)
		mid = application_fixture(father_income_kes=180_000, mother_income_kes=120_000)
		high = application_fixture(father_income_kes=700_000, mother_income_kes=300_000)

		assert scoring_engine.score_family_income(very_low) == 20
		assert scoring_engine.score_family_income(mid) == 12
		assert scoring_engine.score_family_income(high) == 0

	def test_sibling_dependants_raise_education_burden(self, scoring_engine: StructuredScoringEngine) -> None:
		app_0 = application_fixture(num_siblings_in_school=0)
		app_4 = application_fixture(num_siblings_in_school=4)

		assert scoring_engine.score_education_burden(app_4) > scoring_engine.score_education_burden(app_0)

	def test_prior_bursary_receipt_deducts_integrity(self, scoring_engine: StructuredScoringEngine) -> None:
		clean = application_fixture(prior_bursary_received=False)
		prior = application_fixture(prior_bursary_received=True)

		assert scoring_engine.score_integrity(prior) < scoring_engine.score_integrity(clean)

	def test_county_weights_must_sum_to_one(self, scoring_engine: StructuredScoringEngine) -> None:
		invalid = {
			"family_status": 0.4,
			"family_income": 0.3,
			"education_burden": 0.2,
			"academic_standing": 0.1,
			"document_quality": 0.1,
			"integrity": 0.1,
		}

		with pytest.raises(ValueError, match="Weights must sum to 1.0"):
			scoring_engine.validate_weights(invalid)

	def test_custom_weights_prioritize_orphan_status(self, scoring_engine: StructuredScoringEngine) -> None:
		orphan = application_fixture(family_status="ORPHAN")
		non_orphan = application_fixture(family_status="BOTH_PARENTS")

		custom_weights = {
			"family_status": 0.40,
			"family_income": 0.20,
			"education_burden": 0.15,
			"academic_standing": 0.15,
			"document_quality": 0.05,
			"integrity": 0.05,
		}

		score_orphan = scoring_engine.calculate_total_score(orphan, weights=custom_weights)
		score_non_orphan = scoring_engine.calculate_total_score(non_orphan, weights=custom_weights)

		assert score_orphan.total_score - score_non_orphan.total_score >= 20

	def test_score_is_deterministic_for_same_input(self, scoring_engine: StructuredScoringEngine) -> None:
		application = application_fixture()
		score_1 = scoring_engine.calculate_total_score(application, weights=DEFAULT_WEIGHTS)
		score_2 = scoring_engine.calculate_total_score(application, weights=DEFAULT_WEIGHTS)

		assert score_1.total_score == score_2.total_score
		assert score_1.raw_scores == score_2.raw_scores


class TestAnomalyDetection:
	def test_duplicate_national_id_same_cycle_flags(self, anomaly_detector: AnomalyDetector) -> None:
		existing = application_fixture(
			application_id="app-existing",
			national_id="12345678",
			county_id="county-001",
			program_id="prog-2024",
		)
		new = application_fixture(
			application_id="app-new",
			national_id="12345678",
			county_id="county-001",
			program_id="prog-2024",
		)

		flags = anomaly_detector.detect(new, existing_applications=[existing.model_dump()])

		assert any(flag["type"] == "DUPLICATE_NATIONAL_ID" for flag in flags)

	def test_duplicate_national_id_across_counties_not_flagged(self, anomaly_detector: AnomalyDetector) -> None:
		existing = application_fixture(
			application_id="app-existing",
			national_id="12345678",
			county_id="county-001",
		)
		new = application_fixture(
			application_id="app-new",
			national_id="12345678",
			county_id="county-999",
		)

		flags = anomaly_detector.detect(new, existing_applications=[existing.model_dump()])

		assert not any(flag["type"] == "DUPLICATE_NATIONAL_ID" for flag in flags)

	def test_implausible_income_for_low_income_occupation_flags(self, anomaly_detector: AnomalyDetector) -> None:
		application = application_fixture(
			mother_occupation="Subsistence Farmer",
			father_income_kes=2_500_000,
			mother_income_kes=900_000,
		)

		flags = anomaly_detector.detect(application)

		assert any(flag["type"] == "IMPLAUSIBLE_INCOME" for flag in flags)

	def test_stale_document_year_flags(self, anomaly_detector: AnomalyDetector) -> None:
		application = application_fixture(
			program_year=2024,
			document_metadata={
				"FEE_STRUCTURE": {"year": 2022},
				"TRANSCRIPT": {"year": 2024},
			},
		)

		flags = anomaly_detector.detect(application)

		assert any(flag["type"] == "STALE_DOCUMENT" for flag in flags)
