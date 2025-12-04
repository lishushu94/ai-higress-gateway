"""
用户认证路由，处理用户登录、注册和令牌管理
"""

from datetime import datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.deps import get_db
from app.jwt_auth import AuthenticatedUser, require_jwt_refresh_token, require_jwt_token
from app.schemas.user import UserResponse
from app.services.jwt_auth_service import (
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES,
    JWT_REFRESH_TOKEN_EXPIRE_DAYS,
    create_access_token,
    create_refresh_token,
    verify_password,
)
from app.services.role_service import RoleCodeAlreadyExistsError, RoleService
from app.services.user_permission_service import UserPermissionService
from app.services.user_service import (
    EmailAlreadyExistsError,
    UsernameAlreadyExistsError,
    create_user,
    get_user_by_id,
    update_user,
)

router = APIRouter(tags=["authentication"], prefix="/auth")


# 请求和响应模型
class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # 访问令牌过期时间（秒）


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class RegisterRequest(BaseModel):
    email: str = Field(..., description="邮箱地址")
    password: str = Field(..., min_length=6, description="密码")
    display_name: str = None


DEFAULT_USER_ROLE_CODE = "default_user"


def _assign_default_role(db: Session, user_id: UUID) -> None:
    """为新注册用户分配默认角色。"""

    service = RoleService(db)
    role = service.get_role_by_code(DEFAULT_USER_ROLE_CODE)
    if role is None:
        try:
            role = service.create_role(
                code=DEFAULT_USER_ROLE_CODE,
                name="默认用户",
                description="系统默认普通用户角色",
            )
        except RoleCodeAlreadyExistsError:
            role = service.get_role_by_code(DEFAULT_USER_ROLE_CODE)
    if role is None:
        return

    service.set_user_roles(user_id, [role.id])


def _build_user_response(db: Session, user_id: UUID) -> UserResponse:
    """聚合用户基础信息 + 角色 + 能力标记列表，构造 UserResponse。"""

    user = get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在",
        )

    role_service = RoleService(db)
    perm_service = UserPermissionService(db)

    roles = role_service.get_user_roles(user.id)
    role_codes = [r.code for r in roles]
    can_create_private_provider = perm_service.has_permission(
        user.id, "create_private_provider"
    )
    can_submit_shared_provider = perm_service.has_permission(
        user.id, "submit_shared_provider"
    )
    permission_flags = [
        {
            "key": "can_create_private_provider",
            "value": bool(can_create_private_provider),
        },
        {
            "key": "can_submit_shared_provider",
            "value": bool(can_submit_shared_provider),
        },
    ]

    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        display_name=user.display_name,
        avatar=user.avatar,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        role_codes=role_codes,
        permission_flags=permission_flags,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: RegisterRequest,
    db: Session = Depends(get_db),
) -> UserResponse:
    """
    用户注册
    
    Args:
        request: 注册请求数据
        db: 数据库会话
        
    Returns:
        用户信息
        
    Raises:
        HTTPException: 如果用户名或邮箱已存在
    """
    try:
        # 将 RegisterRequest 映射到 UserCreateRequest 所需字段
        from app.schemas.user import UserCreateRequest

        # 生成基于邮箱的用户名
        username_prefix = request.email.split("@")[0]
        # 确保用户名唯一性
        from app.models import User
        from sqlalchemy import select
        existing_user = db.execute(select(User).where(User.username == username_prefix)).scalar_one_or_none()
        
        # 如果存在，添加数字后缀
        counter = 1
        username = username_prefix
        while existing_user is not None:
            username = f"{username_prefix}{counter}"
            existing_user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
            counter += 1
        
        payload = UserCreateRequest(
            username=username,
            email=request.email,
            password=request.password,
            display_name=request.display_name,
        )
        user = create_user(db, payload)
        _assign_default_role(db, user.id)
        return _build_user_response(db, user.id)
    except UsernameAlreadyExistsError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="邮箱已被使用",
        )
    except EmailAlreadyExistsError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="邮箱已被使用",
        )


@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """
    用户登录并获取JWT令牌
    
    Args:
        request: 登录请求数据
        db: 数据库会话
        
    Returns:
        JWT访问令牌和刷新令牌
        
    Raises:
        HTTPException: 如果用户名或密码错误
    """
    # 查找用户，只使用邮箱
    from sqlalchemy import select
    from app.models import User
    
    stmt = select(User).where(User.email == request.email)
    user = db.execute(stmt).scalars().first()
    
    # 如果用户不存在，返回通用错误信息
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="邮箱或密码错误",
        )
    
    # 验证密码
    if not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="邮箱或密码错误",
        )
    
    # 检查用户是否处于活动状态
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账户已被禁用",
        )
    
    # 创建JWT令牌
    access_token_data = {"sub": str(user.id)}
    refresh_token_data = {"sub": str(user.id)}
    
    access_token = create_access_token(access_token_data)
    refresh_token = create_refresh_token(refresh_token_data)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # 转换为秒
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: RefreshTokenRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """
    使用刷新令牌获取新的访问令牌
    
    Args:
        request: 刷新令牌请求
        db: 数据库会话
        
    Returns:
        新的JWT访问令牌和刷新令牌
        
    Raises:
        HTTPException: 如果刷新令牌无效
    """
    try:
        # 验证刷新令牌
        from app.services.jwt_auth_service import decode_token
        payload = decode_token(request.refresh_token)
        
        # 检查令牌类型
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="无效的令牌类型",
            )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="无效的令牌载荷",
            )
        
        # 获取用户信息
        user = get_user_by_id(db, user_id)
        if user is None or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="用户不存在或已被禁用",
            )
        
        # 生成新的令牌
        access_token_data = {"sub": str(user.id)}
        refresh_token_data = {"sub": str(user.id)}
        
        access_token = create_access_token(access_token_data)
        refresh_token = create_refresh_token(refresh_token_data)
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的刷新令牌",
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    current_user: AuthenticatedUser = Depends(require_jwt_token),
    db: Session = Depends(get_db),
) -> UserResponse:
    """
    获取当前认证用户的信息
    
    Args:
        current_user: 当前认证用户
        
    Returns:
        用户信息
    """
    return _build_user_response(db, UUID(current_user.id))


@router.post("/logout")
async def logout(
    current_user: AuthenticatedUser = Depends(require_jwt_token),
) -> dict:
    """
    用户登出
    
    注意：由于JWT是无状态的，实际的登出需要在客户端删除令牌。
    这个端点主要用于记录登出事件或实现令牌黑名单。
    
    Args:
        current_user: 当前认证用户
        
    Returns:
        登出结果
    """
    # TODO: 实现令牌黑名单或记录登出事件
    return {"message": "已成功登出"}


__all__ = ["router"]
