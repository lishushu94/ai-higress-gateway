"""
Redis helper utilities for the routing layer.

Existing code uses `app.deps.get_redis` as a FastAPI dependency.
This module provides a central place to construct the Redis client and
some small helpers for JSON-style key access so that new routing /
provider components do not duplicate this logic.
"""

from __future__ import annotations

import asyncio
import json
from typing import Any
from weakref import WeakKeyDictionary

from fastapi.encoders import jsonable_encoder

try:
    from redis.asyncio import Redis
except ModuleNotFoundError:  # pragma: no cover - allows running without redis installed
    Redis = object  # type: ignore[misc,assignment]

from .settings import settings

_redis_clients_by_loop: WeakKeyDictionary[asyncio.AbstractEventLoop, Redis] = (
    WeakKeyDictionary()
)


def _ensure_event_loop() -> asyncio.AbstractEventLoop:
    try:
        return asyncio.get_running_loop()
    except RuntimeError as exc:  # pragma: no cover - easier debugging for sync misuse
        raise RuntimeError(
            "get_redis_client() 必须在运行中的事件循环内调用，请在 async 环境或 "
            "asyncio.run(...) 内部获取 Redis 客户端"
        ) from exc


def _create_client() -> Redis:
    return Redis.from_url(settings.redis_url, decode_responses=True)


def get_redis_client() -> Redis:
    """
    Return a Redis client bound to the current event loop.
    """

    loop = _ensure_event_loop()
    client = _redis_clients_by_loop.get(loop)
    if client is None:
        client = _create_client()
        _redis_clients_by_loop[loop] = client
    return client


async def redis_get_json(redis: Redis, key: str) -> Any | None:
    """
    Convenience wrapper that loads a JSON value from Redis.
    Returns None on missing key or malformed payload.
    """
    raw = await redis.get(key)
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


async def redis_set_json(
    redis: Redis, key: str, value: Any, *, ttl_seconds: int | None = None
) -> None:
    """
    Store a JSON-serialisable value under the given key with optional TTL.
    """
    serialisable_value = jsonable_encoder(value)
    data = json.dumps(serialisable_value, ensure_ascii=False)
    if ttl_seconds is not None:
        await redis.set(key, data, ex=ttl_seconds)
    else:
        await redis.set(key, data)


async def redis_delete(redis: Redis, key: str) -> None:
    """
    Delete a key if it exists.
    """
    await redis.delete(key)


__all__ = ["get_redis_client", "redis_delete", "redis_get_json", "redis_set_json"]
