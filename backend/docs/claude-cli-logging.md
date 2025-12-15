# Claude CLI 日志和监控

本文档描述了为 Claude CLI 伪装功能添加的日志和监控功能。

## 概述

为了便于调试和监控 Claude CLI 传输模式，我们在以下关键位置添加了详细的日志记录：

1. **请求转换日志** - 记录请求格式转换过程
2. **响应转换日志** - 记录响应格式转换过程
3. **错误日志** - 记录各种错误场景的详细信息
4. **User ID 生成日志** - 记录 user_id 生成过程（脱敏）

## 日志级别

- **DEBUG**: 详细的转换过程信息
- **INFO**: 正常的请求/响应流程
- **WARNING**: 可重试的错误
- **ERROR**: 不可重试的错误和异常

## 日志内容

### 1. User ID 生成日志

**位置**: `backend/app/services/claude_cli_transformer.py:generate_claude_cli_user_id()`

**日志级别**: DEBUG

**日志内容**:
```python
logger.debug(
    "claude_cli: generated user_id prefix=%s session_id=%s generated_session=%s",
    user_id[:20] + "...",  # 只显示前 20 个字符
    session_id,
    generated_session,
)
```

**说明**: 
- user_id 被脱敏，只显示前 20 个字符
- 记录是否生成了新的 session_id

### 2. 请求转换日志

**位置**: `backend/app/services/claude_cli_transformer.py:transform_to_claude_cli_format()`

**日志级别**: INFO (开始), DEBUG (完成)

**日志内容**:
```python
# 转换开始
logger.info(
    "claude_cli: transforming request to Claude CLI format model=%s stream=%s message_count=%d",
    payload.get("model"),
    payload.get("stream", False),
    len(payload.get("messages", [])),
)

# 转换完成
logger.debug(
    "claude_cli: transformation complete messages_transformed=%d system_transformed=%s "
    "tools_added=%s user_id_prefix=%s",
    messages_transformed,
    system_transformed,
    "tools" not in payload,
    user_id[:20] + "...",
)
```

**说明**:
- 记录模型名称、是否流式、消息数量
- 记录转换了多少条消息、是否转换了 system 字段
- user_id 被脱敏

### 3. 响应转换日志

**位置**: `backend/app/services/claude_cli_transformer.py:transform_claude_response_to_openai()`

**日志级别**: INFO (开始), DEBUG (完成)

**日志内容**:
```python
# 转换开始
logger.info(
    "claude_cli: transforming Claude response to OpenAI format response_id=%s "
    "stop_reason=%s has_usage=%s",
    claude_response.get("id", "unknown"),
    claude_response.get("stop_reason", "unknown"),
    "usage" in claude_response,
)

# 转换完成
logger.debug(
    "claude_cli: response transformation complete content_blocks=%d text_blocks=%d "
    "prompt_tokens=%d completion_tokens=%d",
    content_blocks_count,
    text_blocks_count,
    openai_response["usage"].get("prompt_tokens", 0),
    openai_response["usage"].get("completion_tokens", 0),
)
```

**说明**:
- 记录响应 ID、停止原因、是否包含 usage 信息
- 记录内容块数量和 token 统计

### 4. 网络错误日志

**位置**: `backend/app/api/v1/chat_routes.py` (非流式和流式)

**日志级别**: ERROR

**日志内容**:
```python
logger.error(
    "claude_cli: network error during request url=%s provider=%s model=%s "
    "error_type=%s error=%s user_id_prefix=%s",
    claude_url,
    provider_id,
    model_id,
    type(exc).__name__,
    str(exc),
    claude_payload.get("metadata", {}).get("user_id", "")[:20] + "...",
    exc_info=True,
)
```

**说明**:
- 记录完整的错误堆栈 (exc_info=True)
- 记录错误类型和错误消息
- user_id 被脱敏

### 5. 可重试错误日志

**位置**: `backend/app/api/v1/chat_routes.py` (非流式)

**日志级别**: WARNING

**日志内容**:
```python
logger.warning(
    "claude_cli: retryable upstream error status=%s url=%s provider=%s model=%s "
    "user_id_prefix=%s response_length=%d response_preview=%s",
    status_code,
    claude_url,
    provider_id,
    model_id,
    claude_payload.get("metadata", {}).get("user_id", "")[:20] + "...",
    len(text or ""),
    (text or "")[:200],  # 前 200 个字符
)
```

**说明**:
- 记录 HTTP 状态码
- 记录响应长度和前 200 个字符的预览
- user_id 被脱敏

### 6. 不可重试错误日志

**位置**: `backend/app/api/v1/chat_routes.py` (非流式)

**日志级别**: ERROR

**日志内容**:
```python
logger.error(
    "claude_cli: non-retryable upstream error status=%s url=%s provider=%s model=%s "
    "user_id_prefix=%s error_type=%s error_message=%s response_length=%d full_response=%s",
    status_code,
    claude_url,
    provider_id,
    model_id,
    claude_payload.get("metadata", {}).get("user_id", "")[:20] + "...",
    error_detail.get("type") if error_detail else "unknown",
    error_detail.get("message") if error_detail else "unknown",
    len(text or ""),
    text,
)
```

**说明**:
- 记录完整的错误响应
- 尝试解析错误类型和消息
- user_id 被脱敏

### 7. 流式错误日志

**位置**: `backend/app/api/v1/chat_routes.py` (流式)

**日志级别**: ERROR

**日志内容**:
```python
logger.error(
    "claude_cli: streaming error url=%s provider=%s model=%s status=%s "
    "retryable=%s user_id_prefix=%s error_type=%s error_message=%s "
    "response_length=%d response_preview=%s",
    claude_url,
    provider_id,
    model_id,
    err.status_code,
    retryable,
    claude_payload.get("metadata", {}).get("user_id", "")[:20] + "...",
    error_detail.get("type") if error_detail else "unknown",
    error_detail.get("message") if error_detail else "unknown",
    len(err.text or ""),
    (err.text or "")[:200],
)
```

**说明**:
- 记录是否可重试
- 记录错误响应的前 200 个字符
- user_id 被脱敏

### 8. 转换错误日志

**位置**: `backend/app/api/v1/chat_routes.py` (非流式和流式)

**日志级别**: ERROR

**日志内容**:
```python
# 请求转换错误
logger.error(
    "claude_cli: failed to transform request provider=%s model=%s "
    "original_payload_keys=%s error=%s",
    provider_id,
    model_id,
    list(payload.keys()),
    str(exc),
    exc_info=True,
)

# 响应转换错误
logger.error(
    "claude_cli: failed to transform response provider=%s model=%s "
    "response_keys=%s error=%s",
    provider_id,
    model_id,
    list(claude_response.keys()) if isinstance(claude_response, dict) else "not_dict",
    str(exc),
    exc_info=True,
)
```

**说明**:
- 记录原始 payload 的键，便于调试
- 记录完整的错误堆栈

## 安全考虑

### User ID 脱敏

所有日志中的 user_id 都被脱敏处理，只显示前 20 个字符：

```python
user_id[:20] + "..."
```

这样可以：
- 保护 API key 的哈希值不被完整泄露
- 仍然保留足够的信息用于调试和关联日志

### API Key 保护

- API key 永远不会直接记录到日志中
- 只记录 user_id（已脱敏）
- 错误响应中的敏感信息会被适当处理

## 日志查询示例

### 查找特定 Provider 的 Claude CLI 请求

```bash
grep "claude_cli.*provider=duckcoding" backend/logs/app.log
```

### 查找 Claude CLI 错误

```bash
grep "claude_cli.*error" backend/logs/app.log
```

### 查找特定 session 的日志

```bash
grep "session_id=xxx" backend/logs/app.log
```

### 查找转换失败的请求

```bash
grep "failed to transform" backend/logs/app.log
```

## 监控建议

### 关键指标

1. **转换成功率**: 监控转换错误的频率
2. **上游错误率**: 监控 Claude API 返回的错误
3. **网络错误率**: 监控网络连接问题
4. **响应时间**: 监控 Claude CLI 请求的延迟

### 告警规则

建议设置以下告警：

1. **转换错误率 > 5%**: 可能是格式不兼容
2. **上游 4xx 错误率 > 10%**: 可能是 API key 或请求格式问题
3. **上游 5xx 错误率 > 5%**: 上游服务可能有问题
4. **网络错误率 > 5%**: 网络连接可能不稳定

## 故障排查

### 问题：请求转换失败

**查看日志**:
```bash
grep "failed to transform request" backend/logs/app.log
```

**可能原因**:
- 原始 payload 格式不符合预期
- 缺少必需字段

**解决方法**:
- 检查 `original_payload_keys` 字段
- 验证客户端发送的请求格式

### 问题：上游返回 401/403

**查看日志**:
```bash
grep "claude_cli.*non-retryable.*40[13]" backend/logs/app.log
```

**可能原因**:
- API key 无效或过期
- user_id 格式不正确
- TLS 指纹被识别

**解决方法**:
- 验证 API key 是否有效
- 检查 user_id 格式是否符合规范
- 查看完整的错误响应

### 问题：响应转换失败

**查看日志**:
```bash
grep "failed to transform response" backend/logs/app.log
```

**可能原因**:
- Claude 响应格式发生变化
- 响应包含意外的字段

**解决方法**:
- 检查 `response_keys` 字段
- 更新转换逻辑以适应新格式

## 相关文件

- `backend/app/services/claude_cli_transformer.py` - 转换器实现和日志
- `backend/app/api/v1/chat_routes.py` - 路由层日志
- `backend/app/logging_config.py` - 日志配置

## 需求追溯

本日志功能满足以下需求：

- **Requirement 9.1**: 记录详细的错误日志
- **Requirement 9.2**: 记录 user_id（脱敏显示）
- **Requirement 9.3**: 记录请求格式转换
- **Requirement 9.4**: 记录 TLS 指纹伪装失败
- **Requirement 9.5**: 记录上游返回的错误响应
