"""Runtime configuration for the AI scoring service."""
from dataclasses import dataclass
from functools import lru_cache
import os


def _int_env(name: str, default: int) -> int:
	value = os.getenv(name)
	if value is None:
		return default
	try:
		return int(value)
	except ValueError:
		return default


def _float_env(name: str, default: float) -> float:
	value = os.getenv(name)
	if value is None:
		return default
	try:
		return float(value)
	except ValueError:
		return default


@dataclass(frozen=True)
class Settings:
	"""Environment-driven settings for the AI scoring microservice."""

	app_name: str = "smart-bursary-ai-scoring"
	app_env: str = "development"
	app_host: str = "0.0.0.0"
	app_port: int = 8000
	log_level: str = "INFO"

	nestjs_base_url: str = "http://localhost:3001/api/v1"
	internal_service_key: str = ""
	request_timeout_seconds: float = 15.0

	anthropic_api_key: str = ""
	anthropic_model: str = "claude-sonnet-4-20250514"

	default_model_version: str = "v1.0.0"

	@classmethod
	def from_env(cls) -> "Settings":
		return cls(
			app_name=os.getenv("APP_NAME", "smart-bursary-ai-scoring"),
			app_env=os.getenv("APP_ENV", "development"),
			app_host=os.getenv("APP_HOST", "0.0.0.0"),
			app_port=_int_env("APP_PORT", 8000),
			log_level=os.getenv("LOG_LEVEL", "INFO"),
			nestjs_base_url=os.getenv("NESTJS_BASE_URL", "http://localhost:3001/api/v1"),
			internal_service_key=os.getenv("INTERNAL_SERVICE_KEY", ""),
			request_timeout_seconds=_float_env("REQUEST_TIMEOUT_SECONDS", 15.0),
			anthropic_api_key=os.getenv("ANTHROPIC_API_KEY", ""),
			anthropic_model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
			default_model_version=os.getenv("DEFAULT_MODEL_VERSION", "v1.0.0"),
		)


@lru_cache
def get_settings() -> Settings:
	"""Return memoized settings for dependency injection."""
	return Settings.from_env()
