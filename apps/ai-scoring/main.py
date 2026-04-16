"""FastAPI application entrypoint for AI scoring service."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.deps import get_nestjs_client, get_settings
from api.routes.health import router as health_router
from api.routes.scoring import router as scoring_router
from api.routes.weights import router as weights_router

settings = get_settings()

app = FastAPI(
	title=settings.app_name,
	version="1.0.0",
	description="Internal AI scoring microservice for Smart Bursary.",
)

app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(scoring_router)
app.include_router(weights_router)


@app.on_event("shutdown")
async def shutdown_event() -> None:
	"""Close async HTTP clients when the process stops."""
	await get_nestjs_client().close()
