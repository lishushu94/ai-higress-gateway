from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CreditAccountResponse(BaseModel):
    id: UUID
    user_id: UUID
    balance: int = Field(..., description="当前积分余额")
    daily_limit: int | None = Field(
        default=None,
        description="每日最大可消耗的积分（为空表示不限制）",
    )
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CreditTransactionResponse(BaseModel):
    id: UUID
    account_id: UUID
    user_id: UUID
    api_key_id: UUID | None = None
    amount: int = Field(..., description="积分变动值；正数为增加，负数为扣减")
    reason: str = Field(..., description="变动原因，如 usage / stream_estimate / admin_topup 等")
    description: str | None = None
    model_name: str | None = None
    input_tokens: int | None = None
    output_tokens: int | None = None
    total_tokens: int | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CreditTopupRequest(BaseModel):
    amount: int = Field(..., gt=0, description="要增加的积分数量（必须为正数）")
    description: str | None = Field(
        default=None,
        description="本次充值或调整的备注说明",
    )


__all__ = [
    "CreditAccountResponse",
    "CreditTopupRequest",
    "CreditTransactionResponse",
]

