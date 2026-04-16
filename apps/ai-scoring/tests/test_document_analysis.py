from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import Mock

sys.path.append(str(Path(__file__).resolve().parents[1]))

from scoring.document_analysis import DocumentAnalyser


def test_clear_document_scores_high() -> None:
	mock_client = Mock()
	mock_client.analyse_document.return_value = (
		'{"is_legible": true, "appears_authentic": true, "quality_score": 9, "flags": []}'
	)

	analyser = DocumentAnalyser(mock_client)
	result = analyser.analyse("https://example.com/clear.pdf", "FEE_STRUCTURE")

	assert result.quality_score >= 8
	assert result.is_legible is True
	assert result.appears_authentic is True


def test_blurry_document_scores_lower() -> None:
	mock_client = Mock()
	mock_client.analyse_document.return_value = (
		'{"is_legible": false, "appears_authentic": true, "quality_score": 4, "flags": ["low_resolution"]}'
	)

	analyser = DocumentAnalyser(mock_client)
	result = analyser.analyse("https://example.com/blurry.pdf", "TRANSCRIPT")

	assert result.quality_score < 7
	assert result.is_legible is False
	assert "low_resolution" in result.flags


def test_analysis_error_returns_safe_fallback() -> None:
	mock_client = Mock()
	mock_client.analyse_document.side_effect = RuntimeError("Anthropic timeout")

	analyser = DocumentAnalyser(mock_client)
	result = analyser.analyse("https://example.com/doc.pdf", "NATIONAL_ID")

	assert result.quality_score == 5
	assert "analysis_unavailable" in result.flags


def test_malformed_json_response_returns_safe_fallback() -> None:
	mock_client = Mock()
	mock_client.analyse_document.return_value = "not-valid-json"

	analyser = DocumentAnalyser(mock_client)
	result = analyser.analyse("https://example.com/doc.pdf", "FEE_STRUCTURE")

	assert result.quality_score == 5
	assert "analysis_unavailable" in result.flags
