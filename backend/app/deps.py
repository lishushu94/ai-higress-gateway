from collections.abc import AsyncIterator, Iterator

from sqlalchemy.orm import Session

try:
    # Prefer the real Redis type when the dependency is installed.
    from redis.asyncio import Redis
except ModuleNotFoundError:  # pragma: no cover - safety fallback for minimal envs
    Redis = object  # type: ignore[misc,assignment]

from .db import get_db_session
from .http_client import CurlCffiClient
from .redis_client import get_redis_client
from .settings import settings


async def get_redis() -> Redis:
    """
    FastAPI dependency that provides a shared Redis client.

    It delegates to app.redis_client.get_redis_client() so that the
    routing layer and other components can share the same underlying
    connection pool.

    In test environments without the `redis` package installed, tests
    are expected to override this dependency with a fake implementation.
    """
    return get_redis_client()


async def get_http_client() -> AsyncIterator[CurlCffiClient]:
    """
    Provide curl-cffi client for upstream HTTP calls.
    
    使用 curl-cffi 替代 httpx 以支持 TLS 指纹伪装（用于 Claude CLI 等场景）。
    支持通过环境变量 HTTP_PROXY/HTTPS_PROXY 配置代理。
    """
    async with CurlCffiClient(
        timeout=settings.upstream_timeout,
        impersonate="chrome120",  # TLS 指纹伪装为 Chrome 120
        trust_env=True,  # 启用环境变量代理支持
    ) as client:
        yield client


def get_db() -> Iterator[Session]:
    """
    Provide a synchronous SQLAlchemy session.
    """
    yield from get_db_session()
