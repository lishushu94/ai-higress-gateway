import json
import sys
from pathlib import Path
from typing import Any, Dict

import httpx
import pytest
from fastapi.testclient import TestClient

# Ensure project root is on sys.path so that `import service` works
ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from service.deps import get_http_client, get_redis  # noqa: E402
from service.routes import create_app  # noqa: E402


class FakeRedis:
    """
    Minimal async Redis replacement used for tests.
    Supports the subset of commands used by the app.
    """

    def __init__(self) -> None:
        self._data: Dict[str, Any] = {}

    async def get(self, key: str):
        return self._data.get(key)

    async def set(self, key: str, value: str, ex: int | None = None):
        self._data[key] = value

    async def lpush(self, key: str, value: str):
        lst = self._data.setdefault(key, [])
        if not isinstance(lst, list):
            lst = []
        lst.insert(0, value)
        self._data[key] = lst

    async def ltrim(self, key: str, start: int, end: int):
        lst = self._data.get(key, [])
        if not isinstance(lst, list):
            return
        if end == -1:
            slice_end = None
        else:
            slice_end = end + 1
        self._data[key] = lst[start:slice_end]

    async def lrange(self, key: str, start: int, end: int):
        lst = self._data.get(key, [])
        if not isinstance(lst, list):
            return []
        if end == -1:
            slice_end = None
        else:
            slice_end = end + 1
        return lst[start:slice_end]


fake_redis = FakeRedis()


def _mock_send(request: httpx.Request) -> httpx.Response:
    """
    Mock transport handler that emulates the A4F API for tests.
    """
    path = request.url.path

    if path.endswith("/v1/models") and request.method == "GET":
        # Return a simple OpenAI-style model list that includes "test-model".
        data = {
            "object": "list",
            "data": [
                {"id": "test-model", "object": "model"},
            ],
        }
        return httpx.Response(200, json=data)

    if path.endswith("/v1/chat/completions") and request.method == "POST":
        body = json.loads(request.content.decode("utf-8"))
        user_messages = [
            m["content"]
            for m in body.get("messages", [])
            if isinstance(m, dict) and m.get("role") == "user"
        ]
        # A simple echo-style response for testing.
        reply = f"你好！你刚才说: {user_messages[-1]}" if user_messages else "你好！"

        data = {
            "id": "cmpl-test",
            "object": "chat.completion",
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": reply},
                    "finish_reason": "stop",
                }
            ],
        }
        return httpx.Response(200, json=data)

    # Default: return 404 to highlight unexpected calls.
    return httpx.Response(404, json={"error": "unexpected mock path", "path": path})


async def override_get_redis():
    return fake_redis


async def override_get_http_client():
    """
    Provide an AsyncClient whose requests are handled by _mock_send.
    """
    transport = httpx.MockTransport(_mock_send)
    async with httpx.AsyncClient(transport=transport, timeout=30.0) as client:
        yield client


def test_chat_greeting_returns_reply():
    """
    发起一个问候，看是否能拿到正确的回复结构。
    不依赖真实的 Redis 和 A4F，仅测试网关逻辑是否通畅。
    """
    app = create_app()

    # Override Redis and HTTP client dependencies.
    app.dependency_overrides[get_redis] = override_get_redis
    app.dependency_overrides[get_http_client] = override_get_http_client

    with TestClient(app=app, base_url="http://test") as client:
        payload = {
            "model": "test-model",
            "messages": [
                {"role": "user", "content": "你好"},
            ],
            "stream": False,
        }
        headers = {
            # base64("timeline") -> dGltZWxpbmU=
            "Authorization": "Bearer dGltZWxpbmU=",
        }

        resp = client.post("/v1/chat/completions", json=payload, headers=headers)

        assert resp.status_code == 200
        data = resp.json()

        # Basic OpenAI-style response structure checks.
        assert data.get("object") == "chat.completion"
        assert isinstance(data.get("choices"), list)
        assert data["choices"], "choices should not be empty"

        message = data["choices"][0].get("message", {})
        assert message.get("role") == "assistant"
        assert "你好" in message.get("content", "")
