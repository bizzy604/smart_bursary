"""Weight validation routes."""
from fastapi import APIRouter, Depends, HTTPException

from api.deps import get_structured_engine
from scoring.models import WeightsValidationRequest, WeightsValidationResult
from scoring.structured import StructuredScoringEngine

router = APIRouter(tags=["weights"])


@router.post("/weights/validate")
async def validate_weights(
	payload: dict[str, object],
	engine: StructuredScoringEngine = Depends(get_structured_engine),
) -> dict[str, dict[str, object]]:
	try:
		request = WeightsValidationRequest.model_validate(payload)
		normalized = engine.validate_weights(request.weights)
	except ValueError as exc:
		raise HTTPException(status_code=400, detail=str(exc)) from exc

	result = WeightsValidationResult(valid=True, errors=[], normalized_weights=normalized)
	return {"data": result.model_dump()}
