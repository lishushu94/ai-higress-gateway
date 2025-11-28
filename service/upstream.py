import json
from typing import Any, AsyncIterator, Dict, Optional

import httpx

from .context_store import save_context
from .logging_config import logger


def detect_request_format(payload: Dict[str, Any]) -> str:
    """
    Try to detect whether the incoming payload is OpenAI-style or Claude-style.

    This is heuristic-based; you can tweak these rules to fit your real traffic.
    """
    # Claude-style uses max_tokens or max_tokens_to_sample, often with metadata keys
    if "max_tokens_to_sample" in payload:
        return "claude"
    if "anthropic_version" in payload:
        return "claude"

    # OpenAI new API also uses `max_completion_tokens`; prefer claude when clearly signaled
    if "max_completion_tokens" in payload and "anthropic_version" not in payload:
        return "openai"

    # Fallback: treat as OpenAI; both use `model` and `messages`
    return "openai"


async def stream_upstream(
    *,
    client: httpx.AsyncClient,
    method: str,
    url: str,
    headers: Dict[str, str],
    json_body: Dict[str, Any],
    redis,
    session_id: Optional[str],
) -> AsyncIterator[bytes]:
    """
    Stream data from upstream and forward chunks immediately to the caller.
    Conversation context is saved once the upstream stream finishes.
    """
    buffer = bytearray()
    try:
        async with client.stream(method, url, headers=headers, json=json_body) as resp:
            if resp.status_code >= 400:
                # Do NOT raise HTTPException here: response has already started
                # when using StreamingResponse, so raising would cause
                # "Caught handled exception, but response already started".
                text_bytes = await resp.aread()
                text = text_bytes.decode("utf-8", errors="ignore")

                # Log both the error response and the request payload, so that
                # payload_validation_failed 类的问题可以直接在日志里看到请求体。
                try:
                    payload_str = json.dumps(json_body, ensure_ascii=False)
                except TypeError:
                    payload_str = repr(json_body)

                logger.warning(
                    "Upstream streaming error %s for %s; payload=%s; response=%s",
                    resp.status_code,
                    url,
                    payload_str,
                    text,
                )

                # Emit a single SSE-style error frame so the client can see
                # the upstream error in the stream. Status code remains 200.
                try:
                    payload = json.loads(text)
                except json.JSONDecodeError:
                    payload = {
                        "error": {
                            "type": "upstream_error",
                            "status": resp.status_code,
                            "message": text,
                        }
                    }

                error_chunk = (
                    f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
                ).encode("utf-8")
                buffer.extend(error_chunk)
                yield error_chunk
                return

            async for chunk in resp.aiter_bytes():
                if not chunk:
                    continue
                # Stream chunk to caller
                yield chunk
    finally:
        # Save context after stream finishes (or fails)
        if buffer:
            await save_context(
                redis, session_id, json_body, buffer.decode("utf-8", errors="ignore")
            )
