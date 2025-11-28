from typing import Any, AsyncIterator, Dict, Optional

import re
import httpx
from fastapi import Body, Depends, FastAPI, Header, HTTPException, Request, status
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from .auth import require_api_key
from .context_store import save_context
from .deps import get_http_client, get_redis
from .logging_config import logger
from .model_cache import get_models_from_cache, set_models_cache
from .settings import build_upstream_headers, settings
from .upstream import detect_request_format, stream_upstream


class HealthResponse(BaseModel):
    status: str = "ok"


class ModelInfo(BaseModel):
    id: str
    object: Optional[str] = None
    created: Optional[int] = None
    owned_by: Optional[str] = None


class ModelsResponse(BaseModel):
    object: str = "list"
    data: list[ModelInfo] = Field(default_factory=list)


async def _get_or_fetch_models(
    client: httpx.AsyncClient,
    redis,
) -> ModelsResponse:
    """
    Fetch model list from cache or upstream A4F and return a normalized ModelsResponse.
    """
    # Try cache first
    cached = await get_models_from_cache(redis)
    if cached:
        return ModelsResponse(**cached)

    url = f"{settings.a4f_base_url.rstrip('/')}/v1/models"
    headers = build_upstream_headers()

    try:
        r = await client.get(url, headers=headers)
    except httpx.HTTPError as exc:
        # Fallback to 502 if upstream is unavailable
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Upstream models endpoint error: {exc}",
        ) from exc

    if r.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Upstream models endpoint returned {r.status_code}",
        )

    data = r.json()
    # If upstream already returns OpenAI-style model list, pass it through
    if isinstance(data, dict) and "data" in data:
        models_response = ModelsResponse(**data)
    else:
        # Otherwise, normalize a simple list of ids
        models: list[ModelInfo] = []
        if isinstance(data, list):
            for m in data:
                if isinstance(m, dict) and "id" in m:
                    models.append(ModelInfo(**m))
                elif isinstance(m, str):
                    models.append(ModelInfo(id=m))
        models_response = ModelsResponse(data=models)

    # Store normalized payload in cache
    await set_models_cache(redis, models_response.model_dump())

    return models_response


_GEMINI_MODEL_REGEX = re.compile("gemini", re.IGNORECASE)


def _normalize_gemini_input_to_messages(input_value: Any) -> list[Dict[str, str]]:
    """
    Convert a Gemini-style `input` list into OpenAI-style `messages`.
    This is a best-effort adapter so that clients that speak Gemini
    can still go through the OpenAI-compatible /v1/chat/completions
    upstream endpoint.
    """
    if not isinstance(input_value, list):
        return []

    messages: list[Dict[str, str]] = []

    for item in input_value:
        if not isinstance(item, dict):
            continue

        role = item.get("role") or "user"
        content = item.get("content", "")

        # Gemini-style content might be:
        # - a plain string
        # - a list of segments like {"type": "input_text", "text": "..."}
        text: str
        if isinstance(content, str):
            text = content
        elif isinstance(content, list):
            parts: list[str] = []
            for part in content:
                if not isinstance(part, dict):
                    continue
                if isinstance(part.get("text"), str):
                    parts.append(part["text"])
                elif part.get("type") == "input_text" and isinstance(
                    part.get("text"), str
                ):
                    parts.append(part["text"])
            text = "".join(parts)
        else:
            text = str(content)

        messages.append({"role": role, "content": text})

    return messages


def _normalize_payload_by_model(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Inspect payload.model + structure, and normalize provider-specific
    formats (e.g. Gemini) into the OpenAI-style shape expected by A4F.
    """
    model = payload.get("model")
    model_str = str(model or "")

    # Gemini-style: caller sends `input=[{role, content: [...]}, ...]`
    # instead of OpenAI `messages=[{role, content: "..."}, ...]`.
    if (
        "input" in payload
        and "messages" not in payload
        and _GEMINI_MODEL_REGEX.search(model_str)
    ):
        logger.info(
            "Normalizing Gemini-style payload for model %s into OpenAI messages",
            model_str,
        )
        messages = _normalize_gemini_input_to_messages(payload.get("input"))
        if messages:
            new_payload = dict(payload)
            new_payload["messages"] = messages
            new_payload.pop("input", None)
            return new_payload

    # Default: return as-is
    return payload


def create_app() -> FastAPI:
    app = FastAPI(title="AI Gateway", version="0.1.0")

    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        """
        Basic request/response logging middleware.
        Also logs all request headers so we can inspect how different
        clients are passing session-related information.
        """
        client_host = request.client.host if request.client else "-"
        # Copy headers into a plain dict; redact Authorization by default.
        headers_for_log = {}
        for k, v in request.headers.items():
            if k.lower() == "authorization":
                headers_for_log[k] = "***REDACTED***"
            else:
                headers_for_log[k] = v

        logger.info(
            "HTTP %s %s from %s, headers=%s",
            request.method,
            request.url.path,
            client_host,
            headers_for_log,
        )
        try:
            response = await call_next(request)
        except Exception:
            logger.exception(
                "Unhandled error while processing %s %s",
                request.method,
                request.url.path,
            )
            raise
        logger.info(
            "HTTP %s %s -> %s", request.method, request.url.path, response.status_code
        )
        return response

    @app.get("/health", response_model=HealthResponse)
    async def health() -> HealthResponse:
        return HealthResponse()

    @app.get(
        "/models",
        response_model=ModelsResponse,
        dependencies=[Depends(require_api_key)],
    )
    async def list_models(
        client: httpx.AsyncClient = Depends(get_http_client),
        redis=Depends(get_redis),
    ) -> ModelsResponse:
        models_response = await _get_or_fetch_models(client, redis)
        return models_response

    @app.post(
        "/v1/chat/completions",
        dependencies=[Depends(require_api_key)],
    )
    async def chat_completions(
        request: Request,
        client: httpx.AsyncClient = Depends(get_http_client),
        redis=Depends(get_redis),
        x_session_id: Optional[str] = Header(default=None, alias="X-Session-Id"),
        raw_body: Dict[str, Any] = Body(...),
    ):
        """
        Gateway endpoint that accepts both OpenAI-style and Claude-style payloads.
        It auto-detects the format and forwards to the corresponding upstream path.
        It also auto-detects whether the client expects a streaming response.
        """
        # Log the raw payload from client before any normalization/validation
        logger.info("chat_completions: incoming_raw_body=%r", raw_body)

        payload = dict(raw_body)  # shallow copy

        # First normalize payload based on model/provider conventions
        # (e.g. Gemini-style `input` -> OpenAI-style `messages`).
        payload = _normalize_payload_by_model(payload)

        api_style = detect_request_format(payload)

        # Validate requested model against cached/upstream models
        requested_model = payload.get("model")
        if requested_model:
            models_response = await _get_or_fetch_models(client, redis)
            available_models = {m.id for m in models_response.data}
            if requested_model not in available_models:
                logger.warning("Requested unknown model: %s", requested_model)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "message": f"Requested model '{requested_model}' is not available",
                        "available_models": sorted(available_models),
                    },
                )

        # 自动感应是否需要流式：
        # 1. 显式 payload.stream = True
        # 2. Accept 头包含 text/event-stream
        accept_header = request.headers.get("accept", "")
        wants_event_stream = "text/event-stream" in accept_header.lower()
        payload_stream_raw = payload.get("stream", None)

        if payload_stream_raw is False:
            # 客户端显式关闭流式
            stream = False
        else:
            stream = bool(payload_stream_raw) or wants_event_stream

        # 如果通过 Accept 头推断为流式，而 payload 里没带 stream 字段，则自动补上
        if stream and payload_stream_raw is None:
            payload["stream"] = True

        logger.info(
            "chat_completions: api_style=%s, model=%s, stream=%s (payload_stream=%r, accept=%s), session_id=%s",
            api_style,
            payload.get("model"),
            stream,
            payload_stream_raw,
            accept_header,
            x_session_id,
        )

        if api_style == "openai":
            path = "/v1/chat/completions"
        else:
            # Claude-style
            path = "/v1/messages"

        url = f"{settings.a4f_base_url.rstrip('/')}{path}"

        headers = build_upstream_headers()

        if not stream:
            try:
                r = await client.post(url, headers=headers, json=payload)
            except httpx.HTTPError as exc:
                logger.exception("Upstream request error for %s: %s", url, exc)
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Upstream request error: {exc}",
                ) from exc

            text = r.text
            await save_context(redis, x_session_id, payload, text)

            if r.status_code >= 400:
                # When upstream returns a validation error for non-streaming,
                # log the payload so we can inspect what was actually sent.
                logger.warning(
                    "Upstream non-streaming error %s for %s; payload=%r; response=%s",
                    r.status_code,
                    url,
                    payload,
                    text,
                )
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Upstream error {r.status_code}: {text}",
                )

            return JSONResponse(
                content=r.json(),
                status_code=r.status_code,
            )

        # Streaming mode
        async def iterator() -> AsyncIterator[bytes]:
            async for chunk in stream_upstream(
                client=client,
                method="POST",
                url=url,
                headers=headers,
                json_body=payload,
                redis=redis,
                session_id=x_session_id,
            ):
                yield chunk

        return StreamingResponse(iterator(), media_type="text/event-stream")

    @app.get(
        "/context/{session_id}",
        dependencies=[Depends(require_api_key)],
    )
    async def get_context(
        session_id: str,
        redis=Depends(get_redis),
    ):
        """
        Simple endpoint to inspect stored conversation context for a session.
        """
        key = f"session:{session_id}:history"
        items = await redis.lrange(key, 0, -1)
        return {"session_id": session_id, "history": items}

    return app
