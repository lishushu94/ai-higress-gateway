# 认证头格式修复

## 问题描述

在之前的实现中，`_build_provider_headers` 函数对所有 API 风格都使用 `Authorization: Bearer` 格式的认证头，这对于 Claude API 来说是不正确的。

Claude 官方 API 标准使用 `x-api-key` 头进行认证，而不是 `Authorization: Bearer`。

## 修复内容

### 1. 修改 `_build_provider_headers` 函数

**文件**: `backend/app/services/chat_routing_service.py`

添加了 `api_style` 参数，根据不同的 API 风格选择正确的认证头格式：

- **OpenAI 风格** (`api_style="openai"`): 使用 `Authorization: Bearer {key}`
- **Claude 风格** (`api_style="claude"`): 使用 `x-api-key: {key}`
- **默认**: 使用 OpenAI 风格

```python
async def _build_provider_headers(
    provider_cfg: ProviderConfig, redis, api_style: str = "openai"
) -> tuple[dict[str, str], SelectedProviderKey]:
    """
    Build headers for calling a concrete provider upstream.
    
    Args:
        provider_cfg: Provider configuration
        redis: Redis connection
        api_style: API style ("openai", "claude", etc.) to determine auth header format
    
    Returns:
        Tuple of (headers dict, key selection)
    """
    key_selection = await acquire_provider_key(provider_cfg, redis)
    
    # Choose authentication header format based on API style
    headers: dict[str, str] = {"Accept": "application/json"}
    
    if api_style == "claude":
        # Claude API uses x-api-key header
        headers["x-api-key"] = key_selection.key
    else:
        # OpenAI and most other APIs use Authorization: Bearer
        headers["Authorization"] = f"Bearer {key_selection.key}"
    
    # ... rest of the function
```

### 2. 更新调用位置

**文件**: `backend/app/api/v1/chat_routes.py`

更新了两个调用 `_build_provider_headers` 的位置，传入 `api_style` 参数：

```python
# 非流式调用
headers, key_selection = await _build_provider_headers(
    provider_cfg, redis, api_style=api_style
)

# 流式调用
headers, key_selection = await _build_provider_headers(
    provider_cfg, redis, api_style=api_style
)
```

### 3. 修复 Provider Discovery 模块

**文件**: `backend/app/provider/discovery.py`

在获取 Provider 模型列表时，根据 `supported_api_styles` 推断认证头格式：

```python
# 根据 Provider 的 supported_api_styles 推断认证头格式
supported_styles = provider.supported_api_styles or []
if "claude" in supported_styles:
    headers["x-api-key"] = key_selection.key
else:
    headers["Authorization"] = f"Bearer {key_selection.key}"
```

### 4. 修复 Provider Health Check 模块

**文件**: `backend/app/provider/health.py`

在健康检查时，同样根据 `supported_api_styles` 推断认证头格式：

```python
# 根据 Provider 的 supported_api_styles 推断认证头格式
supported_styles = provider.supported_api_styles or []
if "claude" in supported_styles:
    headers["x-api-key"] = selection.key
else:
    headers["Authorization"] = f"Bearer {selection.key}"
```

### 5. 添加测试

**文件**: `backend/tests/test_chat_greeting.py`

添加了三个测试用例来验证认证头的正确性：

1. `test_build_provider_headers_openai_style`: 验证 OpenAI 风格使用 `Authorization: Bearer`
2. `test_build_provider_headers_claude_style`: 验证 Claude 风格使用 `x-api-key`
3. `test_build_provider_headers_default_to_openai`: 验证默认使用 OpenAI 风格

## 影响范围

### 受影响的端点

- `POST /v1/chat/completions` - 非流式和流式请求
- `POST /v1/messages` - Claude Messages API 端点
- `POST /v1/responses` - Responses API 端点

### 受影响的场景

1. **Claude HTTP Transport**: 当 Provider 配置为 `transport: http` 且 `api_style` 为 `claude` 时，现在会正确使用 `x-api-key` 头
2. **Claude CLI Transport**: 不受影响，因为 Claude CLI transport 使用独立的 `build_claude_cli_headers` 函数
3. **OpenAI 和其他 Provider**: 继续使用 `Authorization: Bearer` 头，行为不变

## 向后兼容性

- ✅ 默认行为保持不变（使用 OpenAI 风格）
- ✅ 现有的 OpenAI Provider 配置不受影响
- ✅ Claude CLI transport 模式不受影响
- ✅ 只有明确指定 `api_style="claude"` 的 HTTP transport 才会使用新的认证头格式

## 测试建议

运行以下命令测试修复：

```bash
# 运行所有测试
pytest backend/tests/test_chat_greeting.py

# 只运行新增的认证头测试
pytest backend/tests/test_chat_greeting.py::test_build_provider_headers_openai_style
pytest backend/tests/test_chat_greeting.py::test_build_provider_headers_claude_style
pytest backend/tests/test_chat_greeting.py::test_build_provider_headers_default_to_openai
```

## 修复的文件清单

1. ✅ `backend/app/services/chat_routing_service.py` - 修改 `_build_provider_headers` 函数
2. ✅ `backend/app/api/v1/chat_routes.py` - 更新两个调用位置
3. ✅ `backend/app/provider/discovery.py` - 修复模型发现时的认证头
4. ✅ `backend/app/provider/health.py` - 修复健康检查时的认证头
5. ✅ `backend/tests/test_chat_greeting.py` - 添加三个测试用例
6. ✅ `backend/docs/auth-header-fix.md` - 创建修复文档

## 配置建议

对于 Claude Provider，建议在配置中明确指定 `supported_api_styles`:

```json
{
  "provider_id": "claude-provider",
  "base_url": "https://api.anthropic.com",
  "supported_api_styles": ["claude"],
  "messages_path": "/v1/messages",
  "models_path": "/v1/models"
}
```

这样系统会自动在所有请求中使用 `x-api-key` 认证头。

## 相关文档

- `backend/docs/claude-cli-transport-fix.md`: Claude CLI transport 模式的实现文档
- `backend/app/services/claude_cli_transformer.py`: Claude CLI 专用的头部构造函数
- `backend/app/schemas/provider_control.py`: Provider 配置 schema 定义

## 日期

2025-12-15
