"""Health routes for liveness and readiness checks."""
from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, dict[str, str]]:
	return {"data": {"status": "ok", "service": "ai-scoring"}}
