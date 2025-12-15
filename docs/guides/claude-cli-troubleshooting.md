# Claude CLI 传输模式故障排查指南

## 概述

本指南帮助您诊断和解决使用 Claude CLI 传输模式时遇到的常见问题。

## 快速诊断清单

在深入排查前，请先检查以下基本项：

- [ ] Provider 的 `transport` 字段是否设置为 `claude_cli`
- [ ] API key 是否有效且未过期
- [ ] Base URL 是否正确且可访问
- [ ] 数据库迁移是否已执行（包含 transport 字段）
- [ ] curl-cffi 依赖是否已安装
- [ ] 日志级别是否设置为 INFO 或 DEBUG

## 常见问题和解决方案

### 1. 请求返回 401 Unauthorized

#### 症状
```json
{
  "error": {
    "type": "authentication_error",
    "message": "Invalid API key"
  }
}
```

#### 可能原因

**原因 1: API Key 无效或过期**

检查方法：
```bash
# 查看 Provider 配置
curl -X GET "https://your-gateway.com/providers/{provider_id}" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

解决方案：
1. 更新 Provider 的 API key
2. 确认 API key 在上游提供商处仍然有效

**原因 2: User ID 格式不正确**

检查日志：
```bash
grep "user_id" backend/logs/app-*.log | tail -20
```

预期格式：
```
user_{64位十六进制}_account__session_{uuid}
```

解决方案：
- 检查 `generate_claude_cli_user_id()` 函数是否正常工作
- 验证 API key 哈希计算是否正确

**原因 3: 请求头缺失或不正确**

检查日志中的请求头：
```bash
grep "Claude CLI request" backend/logs/app-*.log | tail -5
```

解决方案：
- 确认 `build_claude_cli_headers()` 函数返回所有必需的头
- 检查是否有自定义请求头覆盖了必需的头

### 2. 请求返回 403 Forbidden

#### 症状
```json
{
  "error": {
    "type": "permission_error",
    "message": "Access denied"
  }
}
```

#### 可能原因

**原因 1: TLS 指纹不匹配**

检查日志：
```bash
grep "TLS" backend/logs/app-*.log | tail -10
```

解决方案：
1. 确认 curl-cffi 正确配置了 `impersonate="chrome120"`
2. 尝试其他浏览器指纹：
   ```python
   # backend/app/deps.py
   impersonate="chrome116"  # 或 "safari15_5", "edge99"
   ```

**原因 2: User-Agent 被拒绝**

检查请求头：
```bash
grep "User-Agent" backend/logs/app-*.log | tail -5
```

预期值：
```
User-Agent: claude-cli/2.0.62 (external, claude-vscode, agent-sdk/0.1.62)
```

解决方案：
- 确认 User-Agent 没有被自定义请求头覆盖
- 检查 `build_claude_cli_headers()` 函数

**原因 3: IP 地址被限制**

解决方案：
1. 检查上游提供商是否有 IP 白名单限制
2. 如果使用代理，确认代理配置正确
3. 联系上游提供商确认访问权限

### 3. 请求格式转换失败

#### 症状
```
ERROR [claude_cli_transformer] Failed to transform request: ...
```

#### 可能原因

**原因 1: 消息格式不符合预期**

检查输入消息：
```python
# 查看原始请求
logger.debug(f"Original request: {json.dumps(payload, indent=2)}")
```

解决方案：
- 确认 `messages` 字段存在且格式正确
- 检查 `content` 字段是否为字符串或数组
- 验证 `transform_to_claude_cli_format()` 函数的逻辑

**原因 2: 缺少必需字段**

常见缺失字段：
- `model`
- `messages`
- `max_tokens`

解决方案：
```python
# 在转换前添加默认值
if "max_tokens" not in payload:
    payload["max_tokens"] = 1024
```

**原因 3: 字段类型错误**

检查方法：
```python
# 添加类型验证
assert isinstance(payload.get("messages"), list)
assert all(isinstance(m.get("content"), (str, list)) for m in payload["messages"])
```

### 4. 响应格式转换失败

#### 症状
```
ERROR [claude_cli_transformer] Failed to transform response: ...
```

#### 可能原因

**原因 1: 上游返回非标准格式**

检查上游响应：
```bash
grep "upstream response" backend/logs/app-*.log | tail -5
```

解决方案：
1. 记录完整的上游响应
2. 调整 `transform_claude_response_to_openai()` 函数以处理该格式
3. 添加错误处理和降级逻辑

**原因 2: Content 块格式异常**

预期格式：
```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```

解决方案：
- 添加对不同 content 块类型的支持
- 处理空 content 的情况

### 5. curl-cffi 相关错误

#### 症状
```
ImportError: cannot import name 'AsyncSession' from 'curl_cffi.requests'
```

#### 解决方案

**步骤 1: 检查安装**
```bash
cd backend
uv pip list | grep curl-cffi
```

**步骤 2: 重新安装**
```bash
cd backend
uv pip install curl-cffi==0.7.0
```

**步骤 3: 验证导入**
```python
python3 -c "from curl_cffi.requests import AsyncSession; print('OK')"
```

**步骤 4: 检查系统依赖**

curl-cffi 需要系统级别的 libcurl：

Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install libcurl4-openssl-dev
```

CentOS/RHEL:
```bash
sudo yum install libcurl-devel
```

macOS:
```bash
brew install curl
```

### 6. 性能问题

#### 症状
- 请求响应时间显著增加
- 内存使用持续上升
- CPU 使用率异常

#### 诊断方法

**检查转换开销**
```python
import time

start = time.time()
transformed = transform_to_claude_cli_format(payload, api_key)
duration = time.time() - start
logger.info(f"Transform duration: {duration*1000:.2f}ms")
```

**检查内存使用**
```bash
# 查看进程内存
ps aux | grep uvicorn

# 查看详细内存分配
python3 -m memory_profiler backend/app/services/claude_cli_transformer.py
```

#### 解决方案

**优化 1: 启用 User ID 缓存**

确认缓存已启用：
```python
# backend/app/services/claude_cli_transformer.py
_user_hash_cache: dict[str, str] = {}

def get_user_hash(api_key: str) -> str:
    if api_key not in _user_hash_cache:
        _user_hash_cache[api_key] = hashlib.sha256(api_key.encode()).hexdigest()
    return _user_hash_cache[api_key]
```

**优化 2: 连接池配置**

调整 curl-cffi 连接池：
```python
# backend/app/http_client.py
class CurlCffiClient:
    def __init__(self, max_connections=100, ...):
        self.max_connections = max_connections
```

**优化 3: 减少日志输出**

生产环境设置日志级别为 WARNING：
```python
# backend/app/logging_config.py
logging.getLogger("claude_cli").setLevel(logging.WARNING)
```

### 7. 流式响应问题

#### 症状
- 流式响应中断
- 收到的数据不完整
- SSE 格式解析错误

#### 诊断方法

检查流式响应日志：
```bash
grep "stream" backend/logs/app-*.log | tail -20
```

#### 解决方案

**问题 1: 连接超时**

增加超时时间：
```python
# backend/app/deps.py
async def get_http_client():
    async with CurlCffiClient(
        timeout=600,  # 10 分钟
        ...
    ) as client:
        yield client
```

**问题 2: SSE 格式不兼容**

添加 SSE 解析逻辑：
```python
async def parse_sse_stream(response):
    async for line in response.aiter_lines():
        if line.startswith("data: "):
            data = line[6:]  # 移除 "data: " 前缀
            if data == "[DONE]":
                break
            yield json.loads(data)
```

### 8. 数据库迁移问题

#### 症状
```
sqlalchemy.exc.OperationalError: (psycopg2.errors.UndefinedColumn) column "transport" does not exist
```

#### 解决方案

**步骤 1: 检查迁移状态**
```bash
cd backend
alembic current
```

**步骤 2: 执行迁移**
```bash
cd backend
alembic upgrade head
```

**步骤 3: 验证字段存在**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'providers' AND column_name = 'transport';
```

**步骤 4: 手动添加字段（如果迁移失败）**
```sql
ALTER TABLE providers 
ADD COLUMN transport VARCHAR(16) NOT NULL DEFAULT 'http';

ALTER TABLE providers 
ADD CONSTRAINT providers_transport_check 
CHECK (transport IN ('http', 'sdk', 'claude_cli'));
```

## 调试技巧

### 1. 启用详细日志

临时启用 DEBUG 日志：
```python
# backend/app/logging_config.py
import logging

logging.getLogger("claude_cli").setLevel(logging.DEBUG)
logging.getLogger("curl_cffi").setLevel(logging.DEBUG)
```

### 2. 记录完整请求/响应

添加调试代码：
```python
# backend/app/services/claude_cli_transformer.py
logger.debug(f"Original payload: {json.dumps(payload, indent=2)}")
logger.debug(f"Transformed payload: {json.dumps(transformed, indent=2)}")
logger.debug(f"Response: {json.dumps(response, indent=2)}")
```

### 3. 使用 curl 测试上游

直接测试上游 API：
```bash
curl -X POST "https://free.duckcoding.com/v1/messages" \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: sk-xxx" \
  -H "User-Agent: claude-cli/2.0.62 (external, claude-vscode, agent-sdk/0.1.62)" \
  -H "Anthropic-Version: 2023-06-01" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "max_tokens": 100,
    "messages": [
      {
        "role": "user",
        "content": [{"type": "text", "text": "Hello"}]
      }
    ],
    "metadata": {
      "user_id": "user_test_account__session_test"
    }
  }'
```

### 4. 对比 HTTP 和 Claude CLI 模式

创建两个相同的 Provider，一个使用 HTTP，一个使用 Claude CLI：
```bash
# HTTP 模式
curl -X POST "https://your-gateway.com/v1/chat/completions" \
  -H "Authorization: Bearer API_KEY_FOR_HTTP_PROVIDER" \
  ...

# Claude CLI 模式
curl -X POST "https://your-gateway.com/v1/chat/completions" \
  -H "Authorization: Bearer API_KEY_FOR_CLI_PROVIDER" \
  ...
```

对比响应差异。

### 5. 检查 Redis 缓存

如果怀疑缓存问题：
```bash
# 连接 Redis
redis-cli

# 查看 Provider 缓存
KEYS providers:*

# 清除特定 Provider 缓存
DEL providers:{provider_id}

# 清除所有 Provider 缓存
FLUSHDB
```

### 6. 监控网络请求

使用 tcpdump 或 Wireshark 捕获网络包：
```bash
# 捕获到特定主机的流量
sudo tcpdump -i any -w /tmp/capture.pcap host free.duckcoding.com

# 分析捕获的包
wireshark /tmp/capture.pcap
```

## 错误代码参考

### 网关错误代码

| 错误代码 | HTTP 状态 | 说明 | 解决方案 |
|---------|----------|------|---------|
| `CLAUDE_CLI_TRANSFORM_ERROR` | 500 | 请求格式转换失败 | 检查输入格式，查看详细日志 |
| `CLAUDE_CLI_USER_ID_ERROR` | 500 | User ID 生成失败 | 检查 API key 是否有效 |
| `CLAUDE_CLI_NETWORK_ERROR` | 503 | 网络请求失败 | 检查网络连接和上游可用性 |
| `CLAUDE_CLI_TLS_ERROR` | 503 | TLS 握手失败 | 检查 curl-cffi 配置和证书 |
| `CLAUDE_CLI_RESPONSE_ERROR` | 502 | 响应格式转换失败 | 检查上游响应格式 |

### 上游错误代码

| HTTP 状态 | 说明 | 常见原因 |
|----------|------|---------|
| 400 | Bad Request | 请求格式不正确，缺少必需字段 |
| 401 | Unauthorized | API key 无效或 user_id 格式错误 |
| 403 | Forbidden | TLS 指纹不匹配或 IP 被限制 |
| 429 | Too Many Requests | 超过速率限制 |
| 500 | Internal Server Error | 上游服务器错误 |
| 502 | Bad Gateway | 上游服务不可用 |
| 503 | Service Unavailable | 上游服务暂时不可用 |

## 日志分析

### 正常请求日志示例

```
2025-12-15 10:30:45.123 INFO [claude_cli] Starting Claude CLI request transformation
2025-12-15 10:30:45.125 INFO [claude_cli] Generated user_id: user_9ef53a9f...*** (redacted)
2025-12-15 10:30:45.126 INFO [claude_cli] Built Claude CLI headers: 15 headers
2025-12-15 10:30:45.128 INFO [claude_cli] Transformed request format: messages=1, tools=0
2025-12-15 10:30:45.130 INFO [curl_cffi] Sending POST request to https://free.duckcoding.com/v1/messages
2025-12-15 10:30:45.850 INFO [curl_cffi] Received response: status=200, size=1234
2025-12-15 10:30:45.852 INFO [claude_cli] Request successful: tokens=150, duration=724ms
```

### 异常请求日志示例

```
2025-12-15 10:35:12.456 ERROR [claude_cli] Failed to transform request
Traceback (most recent call last):
  File "backend/app/services/claude_cli_transformer.py", line 123, in transform_to_claude_cli_format
    content = msg["content"]
KeyError: 'content'

2025-12-15 10:35:12.458 ERROR [chat_routes] Claude CLI transformation failed: provider=duckcoding-66849c86
```

### 日志搜索命令

```bash
# 查找所有 Claude CLI 相关日志
grep "claude_cli" backend/logs/app-*.log

# 查找错误日志
grep "ERROR.*claude_cli" backend/logs/app-*.log

# 查找特定 Provider 的日志
grep "provider=duckcoding-66849c86" backend/logs/app-*.log

# 查找特定时间段的日志
grep "2025-12-15 10:3" backend/logs/app-2025-12-15.log

# 统计错误频率
grep "ERROR.*claude_cli" backend/logs/app-*.log | wc -l
```

## 性能基准

### 正常性能指标

| 指标 | 预期值 | 说明 |
|-----|-------|------|
| 请求格式转换 | <5ms | 包括消息格式转换和 metadata 注入 |
| User ID 生成（首次） | <2ms | 包括 SHA-256 哈希计算 |
| User ID 生成（缓存） | <0.1ms | 从缓存读取 |
| 请求头构建 | <1ms | 构建所有必需的请求头 |
| 总开销 | <10ms | Claude CLI 模式相比 HTTP 模式的额外开销 |

### 性能测试

```bash
# 使用 ab (Apache Bench) 测试
ab -n 1000 -c 10 \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -p request.json \
  https://your-gateway.com/v1/chat/completions

# 使用 wrk 测试
wrk -t 4 -c 100 -d 30s \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -s request.lua \
  https://your-gateway.com/v1/chat/completions
```

## 获取帮助

### 内部资源

- [配置指南](./claude-cli-provider-setup.md)
- [设计文档](../../.kiro/specs/claude-cli-masking/design.md)
- [需求文档](../../.kiro/specs/claude-cli-masking/requirements.md)
- [Claude CLI 日志说明](../../backend/docs/claude-cli-logging.md)

### 日志收集

提交问题时，请包含以下信息：

1. **环境信息**
   ```bash
   python --version
   uv pip list | grep curl-cffi
   cat backend/.python-version
   ```

2. **Provider 配置**
   ```bash
   curl -X GET "https://your-gateway.com/providers/{provider_id}" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

3. **错误日志**
   ```bash
   grep "ERROR.*claude_cli" backend/logs/app-*.log | tail -50
   ```

4. **请求示例**
   ```bash
   # 脱敏后的请求体
   cat request.json
   ```

### 联系方式

- GitHub Issues: [项目仓库](https://github.com/your-org/ai-higress)
- 技术支持邮箱: support@example.com
- 开发者社区: [Discord/Slack 链接]

## 更新日志

- 2025-12-15: 初始版本，涵盖常见问题和调试技巧
