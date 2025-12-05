"""
积分账户与流水相关路由。

设计目标：
- 普通用户可以查询自己的积分余额与近期流水；
- 管理员可以为指定用户充值/调整积分；
- 具体扣费逻辑在 app.services.credit_service 中实现，路由层只做薄封装。
"""

from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.deps import get_db
from app.errors import forbidden
from app.jwt_auth import AuthenticatedUser, require_jwt_token
from app.models import CreditAccount, CreditTransaction
from app.schemas import (
    CreditAccountResponse,
    CreditTopupRequest,
    CreditTransactionResponse,
)
from app.services.credit_service import (
    apply_manual_delta,
    get_or_create_account_for_user,
)

router = APIRouter(
    tags=["credits"],
    prefix="/v1/credits",
    dependencies=[Depends(require_jwt_token)],
)


@router.get("/me", response_model=CreditAccountResponse)
def get_my_credit_account(
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_jwt_token),
) -> CreditAccountResponse:
    """
    获取当前登录用户的积分账户信息。

    若账户不存在，则按配置自动初始化一个新的账户。
    """
    account = get_or_create_account_for_user(db, UUID(current_user.id))
    return CreditAccountResponse.model_validate(account)


@router.get("/me/transactions", response_model=List[CreditTransactionResponse])
def list_my_transactions(
    limit: int = Query(50, ge=1, le=100, description="返回的最大记录数"),
    offset: int = Query(0, ge=0, description="起始偏移量"),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_jwt_token),
) -> List[CreditTransactionResponse]:
    """
    分页返回当前用户的积分流水记录（按时间倒序）。
    """
    # 通过 user_id 维度过滤，避免暴露其他用户数据。
    q = (
        db.query(CreditTransaction)
        .join(CreditAccount, CreditTransaction.account_id == CreditAccount.id)
        .filter(CreditAccount.user_id == UUID(current_user.id))
        .order_by(CreditTransaction.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    items = q.all()
    return [CreditTransactionResponse.model_validate(item) for item in items]


@router.post(
    "/admin/users/{user_id}/topup",
    response_model=CreditAccountResponse,
    status_code=status.HTTP_200_OK,
)
def admin_topup_user_credits(
    user_id: UUID,
    payload: CreditTopupRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_jwt_token),
) -> CreditAccountResponse:
    """
    管理员为指定用户充值/增加积分。

    仅当 current_user.is_superuser 为 True 时允许调用。
    """
    if not current_user.is_superuser:
        raise forbidden("只有超级管理员可以调整用户积分")

    account = apply_manual_delta(
        db,
        user_id=user_id,
        amount=payload.amount,
        reason="admin_topup",
        description=payload.description,
    )
    return CreditAccountResponse.model_validate(account)


__all__ = ["router"]

