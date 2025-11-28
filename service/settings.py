from typing import Dict, Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Read from OS env and optional .env file in project root.
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Upstream A4F API
    a4f_base_url: str = Field("REDACTED_API_URL", alias="A4F_BASE_URL")
    a4f_api_key: str = Field(
        "REDACTED_API_KEY", alias="A4F_API_KEY"
    )

    # Redis
    redis_url: str = Field("redis://redis:6379/0", alias="REDIS_URL")

    # HTTP timeouts
    upstream_timeout: float = 600.0

    # Models cache TTL in seconds
    models_cache_ttl: int = Field(300, alias="MODELS_CACHE_TTL")

    # Browser-mimic headers for upstream (掩护功能)
    mask_as_browser: bool = Field(True, alias="MASK_AS_BROWSER")
    mask_user_agent: str = Field(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36",
        alias="MASK_USER_AGENT",
    )
    mask_origin: Optional[str] = Field(None, alias="MASK_ORIGIN")
    mask_referer: Optional[str] = Field(None, alias="MASK_REFERER")


settings = Settings()  # Reads from environment if available


def build_upstream_headers() -> Dict[str, str]:
    """
    Build headers for calling upstream, optionally mimicking a browser page.
    """
    headers: Dict[str, str] = {
        "Authorization": f"Bearer {settings.a4f_api_key}",
        "Accept": "application/json",
    }

    if settings.mask_as_browser:
        headers["User-Agent"] = settings.mask_user_agent
        if settings.mask_origin:
            headers["Origin"] = settings.mask_origin
        if settings.mask_referer:
            headers["Referer"] = settings.mask_referer

    return headers
