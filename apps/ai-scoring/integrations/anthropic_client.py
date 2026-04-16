"""Anthropic client wrapper for document quality analysis."""
from __future__ import annotations

from typing import Any


class AnthropicClient:
	"""Minimal wrapper around Anthropic messages API for image analysis prompts."""

	def __init__(self, api_key: str, model: str):
		self._api_key = api_key
		self._model = model
		self._client: Any = None

		if api_key:
			try:
				from anthropic import Anthropic
				self._client = Anthropic(api_key=api_key)
			except Exception:
				self._client = None

	def analyse_document(self, document_url: str, doc_type: str):
		if self._client is None:
			raise RuntimeError("Anthropic client is not configured.")

		prompt = (
			f"Analyse this {doc_type} document for a county bursary review. "
			"Return JSON with is_legible, appears_authentic, matches_declared_institution, "
			"quality_score (0-10), and flags (string array)."
		)

		response = self._client.messages.create(
			model=self._model,
			max_tokens=400,
			messages=[
				{
					"role": "user",
					"content": [
						{"type": "text", "text": prompt},
						{"type": "text", "text": f"Document URL: {document_url}"},
					],
				}
			],
		)

		if getattr(response, "content", None):
			return response.content[0].text

		raise RuntimeError("Anthropic returned an empty response")
