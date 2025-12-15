# Claude CLI Provider 配置指南

## 概述

本指南介绍如何在 AI Higress 网关中配置 Claude CLI 传输模式的 Provider，使网关能够伪装成 Claude Code CLI 客户端向上游发送请求。

## 什么是 Claude CLI 传输模式？

Claude CLI 传输模式是一种特殊的 Provider 配置，它允许网关：

1. **伪装成 Claude Code CLI 客户端** - 添加 CLI 特有的请求头和用户标识
2. **自动格式转换** - 将 OpenAI 格式的请求转换为 Claude CLI 格式
3. **TLS 指纹伪装** - 使用 curl-cffi 库模拟浏览器的 TLS 握手特征
4. **生成稳定的 user_id** - 基于 API key 生成符合 Claude CLI 规范的用户标识

## 使用场景

Claude CLI 传输模式适用于以下场景：

- 访问需要 Claude CLI 特征验证的 API 端点
- 绕过某些基于客户端特征的访问限制
- 需要模拟真实 Claude CLI 客户端行为的场景
- 使用第三方 Claude API 代理服务时需要 CLI 特征

## 前置要求

### 系统要求

- Python 3.12+
- curl-cffi 0.7.0+ (已在 backend/pyproject.toml 中配置)
- 数据库已执行最新迁移 (包含 transport 字段)

### 权限要求

- 创建私有 Provider：需要 `create_private_provider` 权限
- 创建公共 Provider：需要超级管理员权限

## 配置步骤

### 1. 通过前端 UI 配置

#### 步骤 1：进入 Provider 管理页面

1. 登录 AI Higress 管理后台
2. 导航到 "提供商管理" 页面
3. 点击 "创建新提供商" 按钮

#### 步骤 2：填写基本信息

- **名称**: 为 Provider 起一个易识别的名称，例如 "DuckCoding Claude CLI"
- **Provider ID**: 系统自动生成或手动指定唯一标识符
- **Base URL**: 上游 API 的基础 URL，例如 `https://free.duckcoding.com`
- **API Key**: 上游提供商的 API 密钥

#### 步骤 3：选择传输模式

在 "传输模式" (Transport) 下拉菜单中选择 **Claude CLI**

![Transport 选择示例](../images/transport-selection.png)

#### 步骤 4：配置其他选项（可选）

- **权重 (Weight)**: 路由权重，默认 1.0
- **区域 (Region)**: 地理区域标识
- **计费系数 (Billing Factor)**: 成本倍率，默认 1.0
- **最大 QPS**: 每秒最大请求数限制
- **自定义请求头**: 额外的 HTTP 请求头（Claude CLI 模式会自动添加必需的头）

#### 步骤 5：保存配置

点击 "保存" 按钮，系统会：
1. 验证配置的有效性
2. 将 Provider 保存到数据库
3. 自动设置 `transport = "claude_cli"`

### 2. 通过 API 配置

#### 创建私有 Provider

```bash
curl -X POST "https://your-gateway.com/users/{user_id}/private-providers" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "DuckCoding Claude CLI",
    "base_url": "https://free.duckcoding.com",
    "api_key": "sk-xxx",
    "transport": "claude_cli",
    "provider_type": "native",
    "weight": 1.0,
    "billing_factor": 1.0
  }'
```

#### 创建公共 Provider（仅管理员）

```bash
curl -X POST "https://your-gateway.com/admin/providers" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider_id": "duckcoding-claude-cli",
    "name": "DuckCoding Claude CLI",
    "base_url": "https://free.duckcoding.com",
    "api_key": "sk-xxx",
    "transport": "claude_cli",
    "provider_type": "native",
    "weight": 1.0,
    "billing_factor": 1.0
  }'
```

#### 更新现有 Provider 为 Claude CLI 模式

```bash
curl -X PUT "https://your-gateway.com/users/{user_id}/private-providers/{provider_id}" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transport": "claude_cli"
  }'
```

### 3. 通过数据库直接配置（不推荐）

如果需要直接修改数据库：

```sql
-- 更新现有 Provider
UPDATE providers 
SET transport = 'claude_cli' 
WHERE provider_id = 'your-provider-id';

-- 验证更新
SELECT provider_id, name, transport 
FROM providers 
WHERE transport = 'claude_cli';
```

**注意**: 直接修改数据库后需要清除相关缓存：

```bash
curl -X POST "https://your-gateway.com/system/cache/clear" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "segments": ["providers", "models"]
  }'
```

## 配置验证

### 1. 检查 Provider 配置

```bash
curl -X GET "https://your-gateway.com/providers/{provider_id}" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

响应应包含：
```json
{
  "id": "uuid",
  "provider_id": "duckcoding-claude-cli",
  "name": "DuckCoding Claude CLI",
  "transport": "claude_cli",
  "base_url": "https://free.duckcoding.com",
  ...
}
```

### 2. 测试健康检查

```bash
curl -X GET "https://your-gateway.com/providers/{provider_id}/health" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. 发送测试请求

使用配置好的 Provider 发送一个测试聊天请求：

```bash
curl -X POST "https://your-gateway.com/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "messages": [
      {
        "role": "user",
        "content": "Hello, this is a test message."
      }
    ],
    "max_tokens": 100
  }'
```

## 工作原理

### 请求流程

```
客户端 (OpenAI 格式)
    ↓
网关接收请求
    ↓
选择 Provider (transport=claude_cli)
    ↓
Claude CLI Transformer
    ├─ 生成 user_id (基于 API key)
    ├─ 添加 Claude CLI 请求头
    ├─ 转换消息格式 (string → array)
    └─ 注入 metadata.user_id
    ↓
curl-cffi HTTP Client
    ├─ 应用 TLS 指纹 (chrome120)
    └─ 发送请求到上游
    ↓
上游 Provider (Claude API)
    ↓
响应转换 (如需要)
    ↓
返回给客户端
```

### User ID 生成规则

Claude CLI 模式会为每个请求生成一个 user_id，格式为：

```
user_{sha256(api_key)}_account__session_{uuid}
```

- **user_hash**: API key 的 SHA-256 哈希值（前 64 个字符）
- **session_uuid**: 会话 UUID，可通过 `X-Session-Id` 请求头指定

示例：
```
user_9ef53a9f2a5786f934c6d7986487f21222aff6602d365a05a63c1f820fe29487_account__session_431d6685-4946-4628-a7e6-a6c5e013ecda
```

### 请求头注入

Claude CLI 模式会自动添加以下请求头：

```
Accept: application/json
Anthropic-Beta: interleaved-thinking-2025-05-14,tool-examples-2025-10-29
Anthropic-Dangerous-Direct-Browser-Access: true
Anthropic-Version: 2023-06-01
Content-Type: application/json
User-Agent: claude-cli/2.0.62 (external, claude-vscode, agent-sdk/0.1.62)
X-Api-Key: {provider_api_key}
X-App: cli
X-Stainless-Arch: x64
X-Stainless-Lang: js
X-Stainless-Os: Linux
X-Stainless-Package-Version: 0.70.0
X-Stainless-Retry-Count: 0
X-Stainless-Runtime: node
X-Stainless-Runtime-Version: v24.3.0
X-Stainless-Timeout: 600
Accept-Encoding: gzip, deflate, br, zstd
Connection: keep-alive
```

### 消息格式转换

**输入 (OpenAI 格式)**:
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Hello!"
    }
  ]
}
```

**输出 (Claude CLI 格式)**:
```json
{
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "Hello!"
        }
      ]
    }
  ],
  "tools": [],
  "metadata": {
    "user_id": "user_9ef53a9f..._account__session_431d6685..."
  }
}
```

## 高级配置

### 自定义会话 ID

可以通过 `X-Session-Id` 请求头指定会话 ID，以保持会话一致性：

```bash
curl -X POST "https://your-gateway.com/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-Session-Id: 431d6685-4946-4628-a7e6-a6c5e013ecda" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

### 配置多个 API Key

Claude CLI 模式支持配置多个 API key 进行负载均衡：

```json
{
  "name": "DuckCoding Claude CLI",
  "base_url": "https://free.duckcoding.com",
  "transport": "claude_cli",
  "api_keys": [
    {
      "key": "sk-key1",
      "weight": 1.0,
      "label": "Primary Key"
    },
    {
      "key": "sk-key2",
      "weight": 0.5,
      "label": "Backup Key"
    }
  ]
}
```

### 配置计费系数

如果该 Provider 的成本与标准不同，可以调整 billing_factor：

```json
{
  "transport": "claude_cli",
  "billing_factor": 0.8  // 该 Provider 成本为标准的 80%
}
```

## 性能优化

### User ID 缓存

系统会自动缓存 API key 的 SHA-256 哈希值，避免重复计算：

- 缓存位置：内存字典
- 缓存策略：永久缓存（直到进程重启）
- 性能提升：约 5-10ms per request

### 连接池复用

curl-cffi 客户端会自动维护连接池：

- 默认最大连接数：100
- 连接超时：30 秒
- 保持连接：启用

### TLS 指纹

默认使用 `chrome120` 指纹，可以在代码中调整：

```python
# backend/app/deps.py
async def get_http_client():
    async with CurlCffiClient(
        timeout=settings.upstream_timeout,
        impersonate="chrome120",  # 可选: chrome116, safari15_5, edge99 等
        trust_env=True,
    ) as client:
        yield client
```

## 监控和日志

### 日志级别

Claude CLI 相关日志会记录在以下位置：

- **INFO**: 正常的请求转换和发送
- **WARNING**: 上游拒绝或格式转换失败
- **ERROR**: 网络错误或系统异常

### 日志示例

```
2025-12-15 10:30:45 INFO [claude_cli] provider=duckcoding-66849c86 user_id=user_9ef53a9f...*** model=claude-sonnet-4-5
2025-12-15 10:30:46 INFO [claude_cli] request successful status=200 tokens=150
```

### 监控指标

可以通过以下 API 查看 Claude CLI 模式的使用情况：

```bash
# 查看按 transport 分组的请求统计
curl -X GET "https://your-gateway.com/metrics/overview/summary?transport=claude_cli" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

## 常见问题

### Q1: 为什么需要 Claude CLI 模式？

A: 某些 Claude API 端点会验证客户端特征，包括：
- User-Agent 必须是 Claude CLI
- 必须包含特定的 X-Stainless-* 请求头
- 必须提供符合格式的 user_id
- TLS 指纹必须匹配浏览器或 CLI 工具

### Q2: Claude CLI 模式会影响性能吗？

A: 影响很小：
- 请求格式转换：<5ms
- User ID 生成（首次）：<2ms
- User ID 生成（缓存）：<0.1ms
- TLS 指纹伪装：无额外开销

### Q3: 可以同时使用 HTTP 和 Claude CLI 模式吗？

A: 可以。每个 Provider 独立配置 transport 类型：
- Provider A: `transport = "http"`
- Provider B: `transport = "claude_cli"`
- Provider C: `transport = "sdk"`

### Q4: 如何知道上游是否需要 Claude CLI 模式？

A: 如果遇到以下错误，可能需要 Claude CLI 模式：
- `401 Unauthorized` 且错误信息提到 "invalid client"
- `403 Forbidden` 且错误信息提到 "unsupported user agent"
- 请求被拒绝但 API key 确认有效

### Q5: Claude CLI 模式支持流式响应吗？

A: 支持。系统会自动处理 Claude 的 SSE 格式流式响应。

## 最佳实践

### 1. 测试先行

在生产环境使用前，先在测试环境验证：
1. 创建测试 Provider
2. 发送少量测试请求
3. 验证响应格式和内容
4. 检查日志是否有异常

### 2. 监控告警

配置监控告警，关注：
- Claude CLI 请求的成功率
- 响应时间是否异常
- 错误日志的频率

### 3. 渐进式迁移

如果要将现有 Provider 切换到 Claude CLI 模式：
1. 先创建新的 Claude CLI Provider
2. 使用小流量测试
3. 逐步增加流量比例
4. 确认稳定后完全切换

### 4. 备份配置

在修改 Provider 配置前：
1. 导出当前配置
2. 记录原始 transport 值
3. 准备回滚方案

## 相关文档

- [API 文档 - Provider 管理](../api/API_Documentation.md#提供商管理)
- [故障排查指南](./claude-cli-troubleshooting.md)
- [Claude CLI 日志说明](../../backend/docs/claude-cli-logging.md)
- [设计文档](../../.kiro/specs/claude-cli-masking/design.md)

## 更新日志

- 2025-12-15: 初始版本，支持 Claude CLI 传输模式
