"""Internal HTTP client for calling NestJS internal endpoints."""
from __future__ import annotations

from typing import Any

import httpx


class NestJsClient:
	"""Read application payloads and push computed score cards to NestJS."""

	def __init__(
		self,
		base_url: str,
		service_key: str,
		timeout_seconds: float,
		http_client: httpx.AsyncClient | None = None,
	):
		self._base_url = base_url.rstrip("/")
		self._service_key = service_key
		self._client = http_client or httpx.AsyncClient(timeout=timeout_seconds)

	async def fetch_application_data(self, application_id: str) -> dict[str, Any]:
		response = await self._client.get(f"{self._base_url}/internal/applications/{application_id}", headers=self._headers)
		response.raise_for_status()
		payload = response.json()
		return payload.get("data", payload)

	async def submit_score(self, score_payload: dict[str, Any]) -> dict[str, Any]:
		response = await self._client.post(
			f"{self._base_url}/internal/ai-scores",
			headers=self._headers,
			json=score_payload,
		)
		response.raise_for_status()
		return response.json()

	@property
	def _headers(self) -> dict[str, str]:
		headers = {"Content-Type": "application/json"}
		if self._service_key:
			headers["X-Service-Key"] = self._service_key
		return headers

	async def close(self) -> None:
		await self._client.aclose()
