"""
Provider 选择器（v2）

目标：把 chat 路由中的“解析/发现/选路”逻辑收敛到一个可复用模块，避免在 route 层堆积：
- Resolve：加载静态 LogicalModel（Redis）或动态构建（/models 缓存）
- Filter：应用用户可访问 provider ∩ API Key 白名单（上层传入 effective_provider_ids）
- Decide：加载指标/动态权重/粘性会话，调用调度器得到候选顺序（selected first）
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID

import httpx
from fastapi import HTTPException, status

try:
    from redis.asyncio import Redis
except ModuleNotFoundError:  # pragma: no cover
    Redis = object  # type: ignore

from sqlalchemy.orm import Session as DbSession

from app.errors import forbidden
from app.logging_config import logger
from app.routing.mapper import select_candidate_upstreams
from app.routing.scheduler import CandidateScore, choose_upstream
from app.routing.session_manager import get_session
from app.schemas import LogicalModel, PhysicalModel, RoutingMetrics, Session as RoutingSession
from app.services.chat_routing_service import _build_dynamic_logical_model_for_group, _build_ordered_candidates
from app.settings import settings
from app.storage.redis_service import get_logical_model
from app.api.v1.chat.routing_state import RoutingStateService


def _status_worse(a: Any, b: Any) -> bool:
    order = {"healthy": 0, "degraded": 1, "down": 2}
    return order.get(getattr(b, "value", str(b)), 0) > order.get(getattr(a, "value", str(a)), 0)


@dataclass(frozen=True)
class ProviderSelectionResult:
    logical_model: LogicalModel
    ordered_candidates: list[CandidateScore]
    scored_candidates: list[CandidateScore]
    base_weights: dict[str, float]


class ProviderSelector:
    """v2 Provider 选择器：负责 Resolve + Decide，返回有序候选列表。"""

    def __init__(
        self,
        *,
        client: httpx.AsyncClient,
        redis: Redis,
        db: DbSession,
        routing_state: RoutingStateService | None = None,
    ):
        self.client = client
        self.redis = redis
        self.db = db
        self.routing_state = routing_state or RoutingStateService(redis=redis)

    async def select(
        self,
        *,
        requested_model: Any,
        lookup_model_id: str,
        api_style: str,
        effective_provider_ids: set[str],
        session_id: str | None = None,
        user_id: UUID | None = None,
        is_superuser: bool = False,
    ) -> ProviderSelectionResult:
        logical_model = await self._resolve_logical_model(
            requested_model=requested_model,
            lookup_model_id=lookup_model_id,
            api_style=api_style,
            allowed_provider_ids=effective_provider_ids,
            user_id=user_id,
            is_superuser=is_superuser,
        )

        if not logical_model.enabled:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Logical model '{logical_model.logical_id}' is disabled",
            )

        candidates: list[PhysicalModel] = select_candidate_upstreams(
            logical_model,
            preferred_region=None,
            exclude_providers=[],
        )
        candidates = [c for c in candidates if c.provider_id in effective_provider_ids]

        # 与 endpoint 选择逻辑保持一致：openai/claude 请求不应路由到 responses-only 上游。
        # 若所有候选都只能走 responses，则提示调用方切换到 /responses 入口。
        if api_style in ("openai", "claude"):
            non_responses = [
                c
                for c in candidates
                if getattr(c, "api_style", "openai") != "responses"
            ]
            if non_responses:
                candidates = non_responses
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "message": "该模型仅支持 Responses API，请使用 /responses 入口调用",
                        "requested_api_style": api_style,
                        "available_upstream_styles": ["responses"],
                    },
                )
        if not candidates:
            raise forbidden("当前用户无权访问该模型的任何可用 Provider")

        # Optional: drop obvious down providers based on cached health.
        health_by_provider: dict[str, Any] = {}
        if settings.enable_provider_health_check and self.redis is not object:
            down_providers: set[str] = set()
            for cand in candidates:
                health = await self.routing_state.get_cached_health_status(cand.provider_id)
                if health is None:
                    continue
                health_by_provider[cand.provider_id] = health
                if health.status.value == "down":
                    down_providers.add(cand.provider_id)
            if down_providers:
                filtered = [c for c in candidates if c.provider_id not in down_providers]
                if filtered:
                    logger.info(
                        "provider_selector: filtered down providers by cached health: %s",
                        sorted(down_providers),
                    )
                    candidates = filtered

        base_weights: dict[str, float] = {c.provider_id: c.base_weight for c in candidates}

        session_obj: RoutingSession | None = None
        if session_id:
            session_obj = await get_session(self.redis, session_id)

        metrics_by_provider = await self.routing_state.load_metrics_for_candidates(
            logical_model.logical_id, candidates
        )

        # Overlay cached health onto metrics so the scheduler can penalize degraded providers.
        if settings.enable_provider_health_check and health_by_provider:
            active_provider_ids = {c.provider_id for c in candidates}
            for pid, health in health_by_provider.items():
                if pid not in active_provider_ids:
                    continue
                existing = metrics_by_provider.get(pid)
                if existing is None:
                    latency_ms = float(getattr(health, "response_time_ms", None) or 2000.0)
                    metrics_by_provider[pid] = RoutingMetrics(
                        logical_model=logical_model.logical_id,
                        provider_id=pid,
                        latency_p95_ms=max(1.0, latency_ms),
                        latency_p99_ms=max(1.0, latency_ms * 1.25),
                        error_rate=0.0,
                        success_qps_1m=0.0,
                        total_requests_1m=0,
                        last_updated=float(getattr(health, "timestamp", 0.0) or 0.0),
                        status=health.status,
                    )
                else:
                    if _status_worse(existing.status, health.status):
                        metrics_by_provider[pid] = existing.model_copy(update={"status": health.status})

        dynamic_weights = await self.routing_state.load_dynamic_weights(
            logical_model.logical_id, candidates
        )
        selected, scored_candidates = choose_upstream(
            logical_model,
            candidates,
            metrics_by_provider,
            logical_model.strategy,
            session=session_obj,
            dynamic_weights=dynamic_weights,
            enable_health_check=settings.enable_provider_health_check,
        )
        ordered_candidates = _build_ordered_candidates(selected, scored_candidates)
        return ProviderSelectionResult(
            logical_model=logical_model,
            ordered_candidates=ordered_candidates,
            scored_candidates=scored_candidates,
            base_weights=base_weights,
        )

    async def _resolve_logical_model(
        self,
        *,
        requested_model: Any,
        lookup_model_id: str,
        api_style: str,
        allowed_provider_ids: set[str],
        user_id: UUID | None,
        is_superuser: bool,
    ) -> LogicalModel:
        # 1) Static logical model in Redis.
        logical_model = await get_logical_model(self.redis, lookup_model_id)
        if logical_model is not None:
            return logical_model

        # 2) Dynamic build from provider /models caches (cache miss 才会打远端).
        built = await _build_dynamic_logical_model_for_group(
            client=self.client,
            redis=self.redis,
            requested_model=requested_model,
            lookup_model_id=lookup_model_id,
            api_style=api_style,
            db=self.db,
            allowed_provider_ids=allowed_provider_ids,
            user_id=user_id,
            is_superuser=is_superuser,
        )
        if built is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": (
                        f"Requested model '{requested_model}' is not available "
                        "in any configured provider"
                    )
                },
            )
        return built


__all__ = ["ProviderSelectionResult", "ProviderSelector"]
