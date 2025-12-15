# Claude Code CLI 请求模拟指南

本文档详细说明了如何模拟 Claude Code CLI 的 API 请求，包括请求格式、认证机制和 user_id 生成算法。

## 概述

Claude Code CLI 使用特定的请求格式和认证机制与 Anthropic API 通信。通过分析真实请求，我们发现了其关键特征并实现了完整的模拟。

## 请求特征

### 1. HTTP 请求头

Claude Code CLI 发送的请求包含以下关键请求头：

```http
Accept: application/json
Anthropic-Beta: interleaved-thinking-2025-05-14,tool-examples-2025-10-29
Anthropic-Dangerous-Direct-Browser-Access: true
Anthropic-Version: 2023-06-01
Content-Type: application/json
User-Agent: claude-cli/2.0.62 (external, claude-vscode, agent-sdk/0.1.62)
X-Api-Key: {api_key}
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

**关键字段说明：**

- `Anthropic-Beta`: 启用的 Beta 功能特性
- `Anthropic-Dangerous-Direct-Browser-Access`: 允许浏览器直接访问
- `User-Agent`: 标识客户端版本和环境
- `X-Stainless-*`: Stainless SDK 的元信息（Claude CLI 使用的 HTTP 客户端库）

### 2. 请求体格式

```json
{
  "model": "claude-sonnet-4-5-20250929",
  "max_tokens": 1024,
  "temperature": 1,
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
  "system": [
    {
      "type": "text",
      "text": "You are Claude Code, Anthropic's official CLI for Claude."
    }
  ],
  "tools": [],
  "metadata": {
    "user_id": "user_{hash}_account__session_{uuid}"
  }
}
```

**关键字段说明：**

- `messages`: 消息数组，`content` 必须是数组格式（即使只有一条文本）
- `system`: 系统提示词数组
- `tools`: 工具定义数组（即使为空也要包含）
- `metadata.user_id`: **最关键的认证字段**，格式见下文

## User ID 生成机制

### 格式

```
user_{SHA256(api_key)}_account__session_{UUID}
```

### 组成部分

1. **用户哈希**：`SHA-256(API key)` 的十六进制表示（64 字符）
   - 基于 API key 生成，确保同一 API key 总是生成相同的用户哈希
   - 提供隐私保护，不直接暴露 API key

2. **会话 UUID**：标准 UUID v4 格式
   - 每次会话生成一个新的 UUID
   - 用于区分不同的会话，支持会话连续性

### Python 实现

```python
import hashlib
import uuid

def generate_claude_cli_user_id(api_key: str, session_id: str = None) -> str:
    """
    生成 Claude Code CLI 格式的 user_id
    
    Args:
        api_key: Claude API key
        session_id: 可选的会话 UUID，如果不提供则生成新的
    
    Returns:
        格式化的 user_id
    """
    # 基于 API key 生成 SHA-256 哈希
    user_hash = hashlib.sha256(api_key.encode()).hexdigest()
    
    # 生成或使用提供的会话 UUID
    if session_id is None:
        session_id = str(uuid.uuid4())
    
    # 组合成完整的 user_id
    user_id = f"user_{user_hash}_account__session_{session_id}"
    
    return user_id
```

### 示例

```python
api_key = "sk-ant-api03-xxx"
user_id = generate_claude_cli_user_id(api_key)
# 输出: user_9ef53a9f2a5786f934c6d7986487f21222aff6602d365a05a63c1f820fe29487_account__session_431d6685-4946-4628-a7e6-a6c5e013ecda
```

## 测试脚本使用

项目提供了完整的测试脚本 `scripts/test_claude_api.py`，支持模拟 Claude Code CLI 发送请求。

### 基本用法

```bash
# 1. 自动生成 user_id（推荐）
cd backend
uv run python ../scripts/test_claude_api.py

# 2. 使用自定义 API key
TEST_API_KEY="sk-ant-api03-xxx" uv run python ../scripts/test_claude_api.py

# 3. 使用真实的 user_id（从日志复制）
uv run python ../scripts/test_claude_api.py "user_xxx_account__session_xxx"

# 4. 自定义会话 ID
TEST_SESSION_ID="custom-uuid" uv run python ../scripts/test_claude_api.py
```

### 环境变量

- `TEST_API_KEY`: 自定义 API key（默认使用脚本中的默认值）
- `TEST_USER_ID`: 直接指定完整的 user_id（跳过自动生成）
- `TEST_SESSION_ID`: 自定义会话 UUID（用于生成 user_id）

## API 验证机制

某些 Claude API 端点（如 `https://free.duckcoding.com/v1/messages`）会验证以下内容：

1. **请求头完整性**：检查是否包含所有必需的 Claude CLI 特征头
2. **User ID 格式**：验证 `metadata.user_id` 是否符合正确格式
3. **User ID 真实性**：验证 user_id 中的哈希是否与 API key 匹配
4. **TLS 指纹**：可能检查 TLS 握手特征（使用 curl-cffi 模拟浏览器指纹）

## 调试技巧

### 1. 查看后端日志

后端已添加详细的请求日志，可以查看真实 Claude Code CLI 的请求信息：

```bash
tail -f logs/$(date +%Y-%m-%d)/chat.log
```

日志会显示：
- 完整的请求头
- 请求体内容
- 请求元信息（URL、客户端 IP 等）

### 2. 提取真实 user_id

从日志中找到 `metadata.user_id` 字段，格式如：

```
user_9ef53a9f2a5786f934c6d7986487f21222aff6602d365a05a63c1f820fe29487_account__session_431d6685-4946-4628-a7e6-a6c5e013ecda
```

可以直接复制用于测试。

### 3. 验证 user_id 生成

```python
import hashlib

api_key = "sk-ant-api03-xxx"
expected_hash = hashlib.sha256(api_key.encode()).hexdigest()
print(f"Expected user hash: {expected_hash}")

# 对比日志中的 user_id 是否包含这个哈希
```

## 常见问题

### Q1: 为什么请求返回 400 "请勿在 Claude Code CLI 之外使用接口"？

**原因**：`metadata.user_id` 不正确或缺失。

**解决方案**：
1. 确保使用正确的 user_id 生成算法
2. 验证 API key 是否正确
3. 使用测试脚本自动生成 user_id

### Q2: 如何保持会话连续性？

**方案**：在同一会话中使用相同的 `session_id`：

```bash
# 第一次请求
SESSION_ID=$(uuidgen)
TEST_SESSION_ID=$SESSION_ID uv run python scripts/test_claude_api.py

# 后续请求使用相同的 SESSION_ID
TEST_SESSION_ID=$SESSION_ID uv run python scripts/test_claude_api.py
```

### Q3: 为什么需要 curl-cffi？

**原因**：某些 API 端点会检查 TLS 指纹和 HTTP/2 特征。

**curl-cffi 优势**：
- 模拟真实浏览器的 TLS 握手
- 支持 HTTP/2 和 Brotli 压缩
- 可以绕过基本的机器人检测

## 技术细节

### TLS 指纹模拟

测试脚本尝试多种浏览器指纹：

```python
impersonate_options = ["chrome120", "chrome119", "chrome110", "safari15_5"]
```

通常 `chrome120` 指纹最容易通过验证。

### HTTP/2 支持

curl-cffi 自动使用 HTTP/2 协议，与真实的 Claude CLI 行为一致。

### 请求超时

Claude CLI 设置的超时时间为 600 秒（10 分钟），适合长时间运行的任务。

## 相关文件

- `scripts/test_claude_api.py`: 完整的测试脚本
- `backend/app/api/v1/chat_routes.py`: 后端路由，包含请求日志
- `logs/YYYY-MM-DD/chat.log`: 每日聊天日志

## 参考资源

- [Anthropic API 文档](https://docs.anthropic.com/claude/reference)
- [curl-cffi GitHub](https://github.com/yifeikong/curl_cffi)
- [Stainless SDK](https://www.stainlessapi.com/)

## 更新日志

- **2025-12-14**: 初始版本，记录 Claude Code CLI 请求格式和 user_id 生成机制
