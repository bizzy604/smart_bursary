"""Document analysis helper wrapping Anthropic responses with safe fallbacks."""
from __future__ import annotations

import json
from typing import Any

from scoring.models import DocumentQualityResult


class DocumentAnalyser:
	"""Parse and normalize document quality responses from the LLM client."""

	def __init__(self, anthropic_client: Any):
		self._anthropic_client = anthropic_client

	def analyse(self, document_url: str, doc_type: str) -> DocumentQualityResult:
		try:
			payload = self._extract_payload(self._anthropic_client.analyse_document(document_url, doc_type))
			return DocumentQualityResult.model_validate(payload)
		except Exception:
			return DocumentQualityResult(quality_score=5, flags=["analysis_unavailable"])

	def _extract_payload(self, response: Any) -> dict[str, Any]:
		if isinstance(response, dict):
			return response

		if isinstance(response, str):
			return json.loads(response)

		content = getattr(response, "content", None)
		if isinstance(content, list) and content:
			first = content[0]
			text = getattr(first, "text", None)
			if isinstance(text, str):
				return json.loads(text)

		raise ValueError("Unsupported response format from document analysis client")
