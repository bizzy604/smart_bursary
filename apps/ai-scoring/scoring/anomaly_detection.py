"""Anomaly detection checks for suspicious application patterns."""
from __future__ import annotations

from typing import Mapping, Optional, Sequence

from scoring.models import ApplicationPayload


class AnomalyDetector:
	"""Detect duplicate identity and plausibility anomalies."""

	_low_income_occupations = {
		"subsistence farmer",
		"casual laborer",
		"unemployed",
		"small scale farmer",
	}

	def detect(
		self,
		application: ApplicationPayload,
		existing_applications: Optional[Sequence[Mapping[str, object]]] = None,
	) -> list[dict[str, object]]:
		flags: list[dict[str, object]] = []
		existing = existing_applications or []

		if application.national_id:
			for row in existing:
				if (
					row.get("national_id") == application.national_id
					and row.get("county_id") == application.county_id
					and row.get("program_id") == application.program_id
				):
					flags.append(
						{
							"type": "DUPLICATE_NATIONAL_ID",
							"message": "National ID already exists in this county cycle.",
						}
					)
					break

		annual_income = (
			application.father_income_kes
			+ application.mother_income_kes
			+ application.guardian_income_kes
		)
		occupations = {
			(application.mother_occupation or "").strip().lower(),
			(application.father_occupation or "").strip().lower(),
		}
		if annual_income >= 2_000_000 and occupations.intersection(self._low_income_occupations):
			flags.append(
				{
					"type": "IMPLAUSIBLE_INCOME",
					"message": "Declared income is implausible for listed occupation.",
				}
			)

		if application.program_year is not None:
			for doc_type, metadata in application.document_metadata.items():
				doc_year = metadata.get("year")
				if doc_year is None:
					continue
				try:
					doc_year_int = int(doc_year)
				except (TypeError, ValueError):
					continue

				if doc_year_int <= application.program_year - 1:
					flags.append(
						{
							"type": "STALE_DOCUMENT",
							"message": f"{doc_type} appears older than the current program cycle.",
						}
					)
					break

		return flags
