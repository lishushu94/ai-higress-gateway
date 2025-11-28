from typing import AsyncIterator

import httpx
from redis.asyncio import Redis

from .settings import settings


async def get_redis() -> Redis:
    """
    Lazy singleton Redis client dependency.
    """
    if not hasattr(get_redis, "_client"):
        get_redis._client = Redis.from_url(settings.redis_url, decode_responses=True)
    return get_redis._client  # type: ignore[attr-defined]


async def get_http_client() -> AsyncIterator[httpx.AsyncClient]:
    """
    Short-lived AsyncClient for upstream HTTP calls.
    """
    async with httpx.AsyncClient(timeout=settings.upstream_timeout) as client:
        yield client

