"""Scoring routes for triggering and retrieving AI score cards."""
from fastapi import APIRouter, Depends, HTTPException

from api.deps import get_scoring_pipeline
from scoring.models import ScoreRequest
from scoring.pipeline import ScoringPipeline

router = APIRouter(tags=["scoring"])


@router.post("/score")
async def score_application(
	payload: dict[str, object],
	pipeline: ScoringPipeline = Depends(get_scoring_pipeline),
) -> dict[str, dict[str, object]]:
	try:
		request = ScoreRequest.model_validate(payload)
		result = await pipeline.score(request)
	except ValueError as exc:
		raise HTTPException(status_code=400, detail=str(exc)) from exc
	except Exception as exc:
		raise HTTPException(status_code=502, detail=f"Scoring pipeline failed: {exc}") from exc

	return {"data": result.model_dump(mode="json")}


@router.get("/score/{application_id}")
async def get_score(
	application_id: str,
	pipeline: ScoringPipeline = Depends(get_scoring_pipeline),
) -> dict[str, dict[str, object]]:
	result = pipeline.get_cached_score(application_id)
	if result is None:
		raise HTTPException(status_code=404, detail="Score card not found")

	return {"data": result.model_dump(mode="json")}
