from __future__ import annotations

from urllib.parse import parse_qs, urlparse

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.deps import get_http_client, get_redis
from app.models import Identity, User
from app.services.linuxdo_oauth_service import STATE_STORAGE_KEY
from app.settings import settings
from tests.utils import InMemoryRedis


def _configure_linuxdo(monkeypatch) -> None:
    monkeypatch.setattr(settings, "linuxdo_enabled", True)
    monkeypatch.setattr(settings, "linuxdo_client_id", "test-client-id")
    monkeypatch.setattr(settings, "linuxdo_client_secret", "test-secret")
    monkeypatch.setattr(
        settings,
        "linuxdo_redirect_uri",
        "https://frontend.example.com/callback",
    )


def test_linuxdo_authorize_redirects_and_stores_state(app_with_inmemory_db, monkeypatch):
    app, _ = app_with_inmemory_db
    fake_redis = InMemoryRedis()

    async def override_get_redis():
        return fake_redis

    app.dependency_overrides[get_redis] = override_get_redis
    _configure_linuxdo(monkeypatch)

    with TestClient(app) as client:
        response = client.get("/auth/oauth/linuxdo/authorize", follow_redirects=False)

    assert response.status_code == 307
    location = response.headers["location"]
    parsed = urlparse(location)
    params = parse_qs(parsed.query)
    assert params["client_id"][0] == "test-client-id"
    state = params["state"][0]
    state_key = STATE_STORAGE_KEY.format(state=state)
    assert state_key in fake_redis._data  # type: ignore[attr-defined]


def test_linuxdo_callback_creates_user_and_returns_tokens(app_with_inmemory_db, monkeypatch):
    app, SessionLocal = app_with_inmemory_db
    fake_redis = InMemoryRedis()

    async def override_get_redis():
        return fake_redis

    def mock_handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/oauth2/token"):
            return httpx.Response(
                200,
                json={
                    "access_token": "linuxdo-token",
                    "token_type": "Bearer",
                    "expires_in": 3600,
                },
            )
        if request.url.path.endswith("/api/user"):
            return httpx.Response(
                200,
                json={
                    "id": 928374,
                    "username": "linuxdo-user",
                    "name": "LinuxDo 昵称",
                    "avatar_template": "https://cdn.example.com/avatar/{size}.png",
                    "active": True,
                },
            )
        return httpx.Response(404)

    async def override_get_http_client():
        transport = httpx.MockTransport(mock_handler)
        async with httpx.AsyncClient(transport=transport) as mock_client:
            yield mock_client

    app.dependency_overrides[get_redis] = override_get_redis
    app.dependency_overrides[get_http_client] = override_get_http_client
    _configure_linuxdo(monkeypatch)
    headers = {
        "User-Agent": "pytest",
        "X-Forwarded-For": "203.0.113.5",
    }

    with TestClient(app) as client:
        authorize_resp = client.get("/auth/oauth/linuxdo/authorize", follow_redirects=False)
        state = parse_qs(urlparse(authorize_resp.headers["location"]).query)["state"][0]
        callback_resp = client.post(
            "/auth/oauth/callback",
            json={"code": "auth-code", "state": state},
            headers=headers,
        )

    assert callback_resp.status_code == 200, callback_resp.text
    data = callback_resp.json()
    assert data["access_token"]
    assert data["refresh_token"]
    assert data["user"]["username"]

    with SessionLocal() as session:
        user = session.execute(
            select(User).where(User.email == "928374@linux.do")
        ).scalar_one()
        assert user.display_name == "LinuxDo 昵称"
        assert user.avatar.endswith("/240.png")
        identity = session.execute(
            select(Identity).where(Identity.user_id == user.id)
        ).scalar_one()
        assert identity.provider == "linuxdo"
