from __future__ import annotations

import re
from typing import List, Optional
from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.logging_config import logger
from app.models import Provider, ProviderAPIKey
from app.schemas.provider_control import (
    UserProviderCreateRequest,
    UserProviderUpdateRequest,
)
from app.services.encryption import encrypt_secret


class UserProviderServiceError(RuntimeError):
    """Base error for user-private provider operations."""


class UserProviderNotFoundError(UserProviderServiceError):
    """Raised when a private provider cannot be found for a user."""


def _provider_exists(session: Session, provider_id: str) -> bool:
    stmt: Select[tuple[Provider]] = select(Provider).where(
        Provider.provider_id == provider_id
    )
    return session.execute(stmt).scalars().first() is not None


def _slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug or "provider"


def _generate_unique_provider_id(
    session: Session,
    owner_id: UUID,
    provider_name: str,
) -> str:
    base_slug = _slugify(provider_name)
    owner_prefix = str(owner_id).split("-")[0][:8]
    base = f"{base_slug}-{owner_prefix}" if owner_prefix else base_slug
    base = base[:50]

    candidate = base
    suffix = 1
    while _provider_exists(session, candidate):
        suffix_str = str(suffix)
        trimmed = base[: max(1, 50 - len(suffix_str) - 1)]
        candidate = f"{trimmed}-{suffix_str}"
        suffix += 1
        if suffix > 50:
            raise UserProviderServiceError("无法生成唯一 provider_id，请稍后重试")
    return candidate


def create_private_provider(
    session: Session,
    owner_id: UUID,
    payload: UserProviderCreateRequest,
) -> Provider:
    """为指定用户创建一个私有 Provider 并写入一条上游密钥。"""

    provider_name = payload.name or "provider"
    if payload.base_url is None:
        raise UserProviderServiceError("base_url 不能为空")
    generated_provider_id = _generate_unique_provider_id(
        session, owner_id, provider_name
    )

    base_url = str(payload.base_url)

    provider = Provider(
        provider_id=generated_provider_id,
        name=provider_name,
        base_url=base_url,
        transport=payload.transport or "http",
        provider_type=payload.provider_type or "native",
        sdk_vendor=payload.sdk_vendor,
        weight=payload.weight or 1.0,
        region=payload.region,
        cost_input=payload.cost_input,
        cost_output=payload.cost_output,
        max_qps=payload.max_qps,
        retryable_status_codes=payload.retryable_status_codes,
        custom_headers=payload.custom_headers,
        models_path=payload.models_path or "/v1/models",
        messages_path=payload.messages_path,
        chat_completions_path=payload.chat_completions_path
        or "/v1/chat/completions",
        responses_path=payload.responses_path,
        supported_api_styles=payload.supported_api_styles,
        static_models=payload.static_models,
        status="healthy",
        owner_id=owner_id,
        visibility="private",
    )

    session.add(provider)
    session.flush()  # ensure provider.id

    # 写入一条上游 API 密钥（必填）
    encrypted_key = encrypt_secret(payload.api_key)
    api_key = ProviderAPIKey(
        provider_uuid=provider.id,
        encrypted_key=encrypted_key,
        weight=1.0,
        max_qps=payload.max_qps,
        label="default",
        status="active",
    )
    session.add(api_key)

    try:
        session.commit()
    except IntegrityError as exc:  # pragma: no cover - 并发场景保护
        session.rollback()
        logger.error("Failed to create private provider: %s", exc)
        raise UserProviderServiceError("无法创建私有提供商") from exc

    session.refresh(provider)
    return provider


def list_private_providers(session: Session, owner_id: UUID) -> List[Provider]:
    """列出指定用户的所有私有 Provider。"""
    stmt: Select[tuple[Provider]] = select(Provider).where(
        Provider.owner_id == owner_id,
        Provider.visibility == "private",
    )
    return list(session.execute(stmt).scalars().all())


def get_private_provider_by_id(
    session: Session,
    owner_id: UUID,
    provider_id: str,
) -> Optional[Provider]:
    stmt: Select[tuple[Provider]] = select(Provider).where(
        Provider.owner_id == owner_id,
        Provider.visibility == "private",
        Provider.provider_id == provider_id,
    )
    return session.execute(stmt).scalars().first()


def update_private_provider(
    session: Session,
    owner_id: UUID,
    provider_id: str,
    payload: UserProviderUpdateRequest,
) -> Provider:
    """更新指定用户的私有 Provider 基本配置。

    目前仅允许更新非标识类字段；provider_id 不可修改。
    """
    provider = get_private_provider_by_id(session, owner_id, provider_id)
    if provider is None:
        raise UserProviderNotFoundError(
            f"Private provider '{provider_id}' not found for user {owner_id}"
        )

    if payload.name is not None:
        provider.name = payload.name
    if payload.base_url is not None:
        provider.base_url = str(payload.base_url)
    if payload.transport is not None:
        provider.transport = payload.transport
        # 切换到 HTTP 时清空 sdk_vendor，避免产生误导配置
        if payload.transport == "http":
            provider.sdk_vendor = None
    if payload.provider_type is not None:
        provider.provider_type = payload.provider_type
    if payload.sdk_vendor is not None:
        provider.sdk_vendor = payload.sdk_vendor
    if payload.weight is not None:
        provider.weight = payload.weight
    if payload.region is not None:
        provider.region = payload.region
    if payload.cost_input is not None:
        provider.cost_input = payload.cost_input
    if payload.cost_output is not None:
        provider.cost_output = payload.cost_output
    if payload.max_qps is not None:
        provider.max_qps = payload.max_qps
    if payload.retryable_status_codes is not None:
        provider.retryable_status_codes = payload.retryable_status_codes
    if payload.custom_headers is not None:
        provider.custom_headers = payload.custom_headers
    if payload.chat_completions_path is not None:
        provider.chat_completions_path = payload.chat_completions_path
    if payload.responses_path is not None:
        provider.responses_path = payload.responses_path
    if payload.supported_api_styles is not None:
        # When explicitly provided, supported_api_styles becomes the
        # authoritative declaration of upstream API styles for this provider.
        provider.supported_api_styles = payload.supported_api_styles
    if payload.models_path is not None:
        provider.models_path = payload.models_path
    if payload.messages_path is not None:
        provider.messages_path = payload.messages_path
    if payload.static_models is not None:
        provider.static_models = payload.static_models

    session.add(provider)
    try:
        session.commit()
    except IntegrityError as exc:  # pragma: no cover - 并发场景保护
        session.rollback()
        logger.error("Failed to update private provider: %s", exc)
        raise UserProviderServiceError("无法更新私有提供商") from exc
    session.refresh(provider)
    return provider


def count_user_private_providers(session: Session, owner_id: UUID) -> int:
    """统计用户的私有 Provider 数量，用于配额控制。"""
    stmt = (
        select(func.count())
        .select_from(Provider)
        .where(Provider.owner_id == owner_id, Provider.visibility == "private")
    )
    return int(session.execute(stmt).scalar_one() or 0)


__all__ = [
    "UserProviderServiceError",
    "UserProviderNotFoundError",
    "create_private_provider",
    "list_private_providers",
    "get_private_provider_by_id",
    "update_private_provider",
    "count_user_private_providers",
]
