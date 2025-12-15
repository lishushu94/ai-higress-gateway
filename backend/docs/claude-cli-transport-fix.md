# Claude CLI Transport 修复说明

## 问题描述

使用 `transport=claude_cli` 时，duckcoding 服务器返回错误：
```
请勿在 Claude Code CLI 之外使用接口
```

## 根本原因

通过对比测试脚本（`scripts/test_claude_api.py`）和实际网关请求，发现以下差异：

### 1. 缺少 `temperature` 参数
- **测试脚本**：包含 `"temperature": 1`
- **网关请求**：缺少此参数
- **影响**：服务器可能通过此参数判断是否为真实 Claude CLI 客户端

### 2. URL 缺少 `?beta=true` 参数
- **测试脚本**：`https://free.duckcoding.com/v1/messages?beta=true`
- **网关请求**：`https://free.duckcoding.com/v1/messages`
- **影响**：Claude CLI 始终携带此参数以启用 beta 功能

## 修复方案

### 1. 在 `claude_cli_transformer.py` 中添加默认 temperature

```python
# Add temperature if not present (Claude CLI default)
if "temperature" not in transformed:
    transformed["temperature"] = 1
    logger.debug("claude_cli: added default temperature=1")
```

### 2. 在 `chat_routes.py` 中修改 URL 构造

**流式请求**（第 1563 行）：
```python
# Use provider's base_url + /v1/messages endpoint with beta parameter
# Claude CLI always adds ?beta=true to enable beta features
claude_url = f"{str(provider_cfg.base_url).rstrip('/')}/v1/messages?beta=true"
```

**非流式请求**（第 589 行）：
```python
# Use provider's base_url + /v1/messages endpoint with beta parameter
# Claude CLI always adds ?beta=true to enable beta features
claude_url = f"{str(provider_cfg.base_url).rstrip('/')}/v1/messages?beta=true"
```

## 测试验证

### 对比请求格式

**修复前**：
```json
{
  "model": "claude-sonnet-4-5-20250929",
  "max_tokens": 64000,
  "system": [{"type": "text", "text": "test"}],
  "messages": [...],
  "stream": true,
  "tools": [],
  "metadata": {"user_id": "user_..."}
}
```

**修复后**：
```json
{
  "model": "claude-sonnet-4-5-20250929",
  "max_tokens": 64000,
  "temperature": 1,  // ✅ 新增
  "system": [{"type": "text", "text": "test"}],
  "messages": [...],
  "stream": true,
  "tools": [],
  "metadata": {"user_id": "user_..."}
}
```

**URL 修复**：
- 修复前：`https://free.duckcoding.com/v1/messages`
- 修复后：`https://free.duckcoding.com/v1/messages?beta=true` ✅

### 测试步骤

1. 重启后端服务
2. 使用 CherryStudio 或其他客户端发送请求
3. 观察日志中的请求体是否包含 `temperature: 1`
4. 观察日志中的 URL 是否包含 `?beta=true`
5. 验证 duckcoding 是否正常响应

## 相关文件

- `backend/app/services/claude_cli_transformer.py`：请求转换逻辑
- `backend/app/api/v1/chat_routes.py`：路由和 URL 构造
- `scripts/test_claude_api.py`：测试脚本参考
- `scripts/test_anyrouter_api.py`：测试脚本参考

## 注意事项

1. **temperature 默认值**：Claude CLI 默认使用 `temperature=1`，这是完全随机的采样策略
2. **beta 参数**：此参数启用 Claude 的 beta 功能，如 `interleaved-thinking` 等
3. **向后兼容**：修改不影响其他 transport 类型（http、sdk）
4. **用户覆盖**：如果用户在请求中已指定 temperature，则不会被覆盖

## 日志示例

修复后的日志应显示：
```
claude_cli: added default temperature=1
claude_cli: transformation complete messages_transformed=0 system_transformed=False tools_added=False temperature=1 user_id_prefix=user_0d4039137f0453d...
chat_completions: starting Claude CLI streaming request to url=https://free.duckcoding.com/v1/messages?beta=true user_id=user_0d4039137f0453dac48d32661...
```
