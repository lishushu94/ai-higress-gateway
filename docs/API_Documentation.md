# AI Higress API 文档

本文档详细介绍了 AI Higress 项目的所有 API 接口，包括请求参数、响应格式和认证方式，用于辅助前端开发。

## 目录

- [认证](#认证)
- [用户管理](#用户管理)
- [API密钥管理](#api密钥管理)
- [厂商密钥管理](#厂商密钥管理)
- [提供商管理](#提供商管理)
- [逻辑模型管理](#逻辑模型管理)
- [路由管理](#路由管理)
- [会话管理](#会话管理)
- [系统管理](#系统管理)

---

## 认证

### 1. 用户注册

**接口**: `POST /auth/register`

**描述**: 创建新用户账户。

**请求体**:
```json
{
  "username": "string (3-50字符)",
  "email": "string (有效邮箱)",
  "password": "string (最少6字符)",
  "display_name": "string (可选)"
}
```

**响应**:
```json
{
  "id": "uuid",
  "username": "string",
  "email": "string",
  "display_name": "string | null",
  "avatar": "string | null",
  "is_active": true,
  "is_superuser": false,
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

**错误响应**:
- 400: 用户名已存在
- 400: 邮箱已被使用

---

### 2. 用户登录

**接口**: `POST /auth/login`

**描述**: 用户登录获取 JWT 令牌。

**请求体**:
```json
{
  "username": "string", // 用户名或邮箱
  "password": "string"
}
```

**响应**:
```json
{
  "access_token": "string",
  "refresh_token": "string",
  "token_type": "bearer",
  "expires_in": 3600 // 访问令牌过期时间(秒)
}
```

**错误响应**:
- 401: 用户名或密码错误
- 403: 账户已被禁用

---

### 3. 刷新令牌

**接口**: `POST /auth/refresh`

**描述**: 使用刷新令牌获取新的访问令牌。

**请求体**:
```json
{
  "refresh_token": "string"
}
```

**响应**:
```json
{
  "access_token": "string",
  "refresh_token": "string",
  "token_type": "bearer",
  "expires_in": 3600
}
```

**错误响应**:
- 401: 无效的刷新令牌

---

### 4. 获取当前用户信息

**接口**: `GET /auth/me`

**描述**: 获取当前认证用户的信息。

**认证**: JWT 令牌

**响应**:
```json
{
  "id": "uuid",
  "username": "string",
  "email": "string",
  "display_name": "string | null",
  "avatar": "string | null",
  "is_superuser": true/false
}
```

---

### 5. 用户登出

**接口**: `POST /auth/logout`

**描述**: 用户登出。

**认证**: JWT 令牌

**响应**:
```json
{
  "message": "已成功登出"
}
```

---

## 用户管理

### 1. 创建用户

**接口**: `POST /users`

**描述**: 创建新用户。

**认证**: JWT 令牌

**请求体**:
```json
{
  "username": "string (3-64字符, 字母数字._-)",
  "email": "string (有效邮箱)",
  "password": "string (8-128字符)",
  "display_name": "string (可选, 最大255字符)",
  "avatar": "string (可选, 最大512字符)"
}
```

**响应**:
```json
{
  "id": "uuid",
  "username": "string",
  "email": "string",
  "display_name": "string | null",
  "avatar": "string | null",
  "is_active": true,
  "is_superuser": false,
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

---

### 2. 获取当前用户信息

**接口**: `GET /users/me`

**描述**: 获取当前认证用户的信息。

**认证**: JWT 令牌

**响应**:
```json
{
  "id": "uuid",
  "username": "string",
  "email": "string",
  "display_name": "string | null",
  "avatar": "string | null",
  "is_active": true,
  "is_superuser": false,
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

---

### 3. 更新用户信息

**接口**: `PUT /users/{user_id}`

**描述**: 更新用户信息。

**认证**: JWT 令牌

**请求体**:
```json
{
  "email": "string (可选)",
  "password": "string (可选, 8-128字符)",
  "display_name": "string (可选, 最大255字符)",
  "avatar": "string (可选, 最大512字符)"
}
```

**响应**:
```json
{
  "id": "uuid",
  "username": "string",
  "email": "string",
  "display_name": "string | null",
  "avatar": "string | null",
  "is_active": true,
  "is_superuser": false,
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

---

### 4. 更新用户状态

**接口**: `PUT /users/{user_id}/status`

**描述**: 允许超级用户启用/禁用用户。

**认证**: JWT 令牌 (仅限超级用户)

**请求体**:
```json
{
  "is_active": true/false
}
```

**响应**:
```json
{
  "id": "uuid",
  "username": "string",
  "email": "string",
  "display_name": "string | null",
  "avatar": "string | null",
  "is_active": true/false,
  "is_superuser": false,
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

---

## API密钥管理

### 1. 获取API密钥列表

**接口**: `GET /users/{user_id}/api-keys`

**描述**: 获取指定用户的所有API密钥。

**认证**: JWT 令牌

**响应**:
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "name": "string",
    "key_prefix": "string",
    "expiry_type": "week/month/year/never",
    "expires_at": "datetime | null",
    "created_at": "datetime",
    "updated_at": "datetime",
    "has_provider_restrictions": true/false,
    "allowed_provider_ids": ["string"]
  }
]
```

---

### 2. 创建API密钥

**接口**: `POST /users/{user_id}/api-keys`

**描述**: 创建新的API密钥。

**认证**: JWT 令牌

**请求体**:
```json
{
  "name": "string (1-255字符)",
  "expiry": "week/month/year/never (可选, 默认never)",
  "allowed_provider_ids": ["string"] (可选, 限制可访问的提供商)
}
```

**响应**:
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "string",
  "key_prefix": "string",
  "expiry_type": "week/month/year/never",
  "expires_at": "datetime | null",
  "created_at": "datetime",
  "updated_at": "datetime",
  "has_provider_restrictions": true/false,
  "allowed_provider_ids": ["string"],
  "token": "string" // 完整密钥，仅在创建时返回
}
```

**错误响应**:
- 400: 密钥名称已存在

---

### 3. 更新API密钥

**接口**: `PUT /users/{user_id}/api-keys/{key_id}`

**描述**: 更新API密钥信息。

**认证**: JWT 令牌

**请求体**:
```json
{
  "name": "string (可选)",
  "expiry": "week/month/year/never (可选)",
  "allowed_provider_ids": ["string"] (可选, 空数组表示清除限制)
}
```

**响应**:
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "string",
  "key_prefix": "string",
  "expiry_type": "week/month/year/never",
  "expires_at": "datetime | null",
  "created_at": "datetime",
  "updated_at": "datetime",
  "has_provider_restrictions": true/false,
  "allowed_provider_ids": ["string"]
}
```

**错误响应**:
- 400: 密钥名称已存在

---

### 4. 获取API密钥允许的提供商

**接口**: `GET /users/{user_id}/api-keys/{key_id}/allowed-providers`

**描述**: 获取API密钥允许访问的提供商列表。

**认证**: JWT 令牌

**响应**:
```json
{
  "has_provider_restrictions": true/false,
  "allowed_provider_ids": ["string"]
}
```

---

### 5. 设置API密钥允许的提供商

**接口**: `PUT /users/{user_id}/api-keys/{key_id}/allowed-providers`

**描述**: 设置API密钥允许访问的提供商列表。

**认证**: JWT 令牌

**请求体**:
```json
{
  "allowed_provider_ids": ["string"] // 空数组表示清除限制
}
```

**响应**:
```json
{
  "has_provider_restrictions": true/false,
  "allowed_provider_ids": ["string"]
}
```

---

### 6. 删除API密钥允许的提供商

**接口**: `DELETE /users/{user_id}/api-keys/{key_id}/allowed-providers/{provider_id}`

**描述**: 从API密钥允许的提供商列表中移除指定的提供商。

**认证**: JWT 令牌

**成功响应**: 204 No Content

---

### 7. 删除API密钥

**接口**: `DELETE /users/{user_id}/api-keys/{key_id}`

**描述**: 删除指定的API密钥。

**认证**: JWT 令牌

**成功响应**: 204 No Content

---

## 厂商密钥管理

### 1. 获取厂商API密钥列表

**接口**: `GET /providers/{provider_id}/keys`

**描述**: 获取指定厂商的所有API密钥。

**认证**: JWT 令牌 (仅限超级用户)

**响应**:
```json
[
  {
    "id": "string",
    "provider_id": "string",
    "label": "string",
    "weight": 1.0,
    "max_qps": 1000,
    "status": "active/inactive",
    "created_at": "datetime",
    "updated_at": "datetime | null"
  }
]
```

---

### 2. 创建厂商API密钥

**接口**: `POST /providers/{provider_id}/keys`

**描述**: 为指定厂商创建新的API密钥。

**认证**: JWT 令牌 (仅限超级用户)

**请求体**:
```json
{
  "key": "string", // API认证密钥或令牌
  "label": "string", // 密钥的可识别标签
  "weight": 1.0, // 相对路由权重
  "max_qps": 1000, // 可选的每密钥QPS限制
  "status": "active/inactive" // 密钥状态
}
```

**响应**:
```json
{
  "id": "string",
  "provider_id": "string",
  "label": "string",
  "weight": 1.0,
  "max_qps": 1000,
  "status": "active/inactive",
  "created_at": "datetime",
  "updated_at": "datetime | null"
}
```

---

### 3. 获取厂商API密钥详情

**接口**: `GET /providers/{provider_id}/keys/{key_id}`

**描述**: 获取指定的厂商API密钥详情。

**认证**: JWT 令牌 (仅限超级用户)

**响应**:
```json
{
  "id": "string",
  "provider_id": "string",
  "label": "string",
  "weight": 1.0,
  "max_qps": 1000,
  "status": "active/inactive",
  "created_at": "datetime",
  "updated_at": "datetime | null"
}
```

**错误响应**:
- 404: 密钥不存在

---

### 4. 更新厂商API密钥

**接口**: `PUT /providers/{provider_id}/keys/{key_id}`

**描述**: 更新指定的厂商API密钥。

**认证**: JWT 令牌 (仅限超级用户)

**请求体**:
```json
{
  "key": "string", // 可选
  "label": "string", // 可选
  "weight": 1.0, // 可选
  "max_qps": 1000, // 可选
  "status": "active/inactive" // 可选
}
```

**响应**:
```json
{
  "id": "string",
  "provider_id": "string",
  "label": "string",
  "weight": 1.0,
  "max_qps": 1000,
  "status": "active/inactive",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

---

### 5. 删除厂商API密钥

**接口**: `DELETE /providers/{provider_id}/keys/{key_id}`

**描述**: 删除指定的厂商API密钥。

**认证**: JWT 令牌 (仅限超级用户)

**成功响应**: 204 No Content

---

## 提供商管理

### 1. 获取提供商列表

**接口**: `GET /providers`

**描述**: 获取所有已配置的提供商列表。

**认证**: API密钥

**响应**:
```json
{
  "providers": [
    {
      "id": "string",
      "name": "string",
      "base_url": "url",
      "api_key": "string | null",
      "api_keys": [
        {
          "key": "string",
          "weight": 1.0,
          "max_qps": 1000,
          "label": "string"
        }
      ],
      "models_path": "/v1/models",
      "messages_path": "/v1/message",
      "weight": 1.0,
      "region": "string | null",
      "cost_input": 0.0,
      "cost_output": 0.0,
      "max_qps": 1000,
      "custom_headers": {},
      "retryable_status_codes": [429, 500, 502, 503, 504],
      "static_models": [],
      "transport": "http/sdk",
      "provider_type": "native/aggregator"
    }
  ],
  "total": 1
}
```

---

### 2. 获取指定提供商信息

**接口**: `GET /providers/{provider_id}`

**描述**: 获取指定提供商的配置信息。

**认证**: API密钥

**响应**:
```json
{
  "id": "string",
  "name": "string",
  "base_url": "url",
  "api_key": "string | null",
  "api_keys": [
    {
      "key": "string",
      "weight": 1.0,
      "max_qps": 1000,
      "label": "string"
    }
  ],
  "models_path": "/v1/models",
  "messages_path": "/v1/message",
  "weight": 1.0,
  "region": "string | null",
  "cost_input": 0.0,
  "cost_output": 0.0,
  "max_qps": 1000,
  "custom_headers": {},
  "retryable_status_codes": [429, 500, 502, 503, 504],
  "static_models": [],
  "transport": "http/sdk",
  "provider_type": "native/aggregator"
}
```

**错误响应**:
- 404: 提供商不存在

---

### 3. 获取提供商模型列表

**接口**: `GET /providers/{provider_id}/models`

**描述**: 获取指定提供商支持的模型列表。

**认证**: API密钥

**响应**:
```json
{
  "models": [
    {
      "id": "string",
      "object": "string",
      "created": 1234567890,
      "owned_by": "string"
    }
  ],
  "total": 1
}
```

---

### 4. 检查提供商健康状态

**接口**: `GET /providers/{provider_id}/health`

**描述**: 执行轻量级健康检查。

**认证**: API密钥

**响应**:
```json
{
  "status": "healthy/degraded/down",
  "last_check": 1234567890.0,
  "metadata": {}
}
```

**错误响应**:
- 404: 提供商不存在

---

### 5. 获取提供商路由指标

**接口**: `GET /providers/{provider_id}/metrics`

**描述**: 获取提供商的路由指标。

**认证**: API密钥

**查询参数**:
- logical_model (可选): 逻辑模型过滤器

**响应**:
```json
{
  "metrics": [
    {
      "logical_model": "string",
      "provider_id": "string",
      "success_rate": 0.99,
      "avg_latency_ms": 100,
      "p95_latency_ms": 200,
      "p99_latency_ms": 300,
      "last_success": 1234567890.0,
      "last_failure": 1234567890.0,
      "consecutive_failures": 0,
      "total_requests": 1000,
      "total_failures": 10,
      "window_start": 1234567890.0,
      "window_duration": 300.0
    }
  ]
}
```

**错误响应**:
- 404: 提供商不存在

---

## 逻辑模型管理

### 1. 获取逻辑模型列表

**接口**: `GET /logical-models`

**描述**: 获取所有存储在 Redis 中的逻辑模型。

**认证**: API密钥

**响应**:
```json
{
  "models": [
    {
      "logical_id": "string",
      "name": "string",
      "description": "string",
      "enabled": true,
      "capabilities": ["text_completion", "chat_completion"],
      "default_strategy": "string",
      "upstreams": [
        {
          "provider_id": "string",
          "model_id": "string",
          "region": "string | null",
          "cost_input": 0.0,
          "cost_output": 0.0,
          "enabled": true,
          "weight": 1.0
        }
      ],
      "metadata": {}
    }
  ],
  "total": 1
}
```

---

### 2. 获取逻辑模型详情

**接口**: `GET /logical-models/{logical_model_id}`

**描述**: 获取指定逻辑模型的详情。

**认证**: API密钥

**响应**:
```json
{
  "logical_id": "string",
  "name": "string",
  "description": "string",
  "enabled": true,
  "capabilities": ["text_completion", "chat_completion"],
  "default_strategy": "string",
  "upstreams": [
    {
      "provider_id": "string",
      "model_id": "string",
      "region": "string | null",
      "cost_input": 0.0,
      "cost_output": 0.0,
      "enabled": true,
      "weight": 1.0
    }
  ],
  "metadata": {}
}
```

**错误响应**:
- 404: 逻辑模型不存在

---

### 3. 获取逻辑模型上游

**接口**: `GET /logical-models/{logical_model_id}/upstreams`

**描述**: 获取映射到逻辑模型的上游物理模型。

**认证**: API密钥

**响应**:
```json
{
  "upstreams": [
    {
      "provider_id": "string",
      "model_id": "string",
      "region": "string | null",
      "cost_input": 0.0,
      "cost_output": 0.0,
      "enabled": true,
      "weight": 1.0
    }
  ]
}
```

**错误响应**:
- 404: 逻辑模型不存在

---

## 路由管理

### 1. 路由决策

**接口**: `POST /routing/decide`

**描述**: 计算逻辑模型请求的路由决策。

**认证**: API密钥

**请求体**:
```json
{
  "logical_model": "string",
  "conversation_id": "string (可选, 用于粘性会话)",
  "user_id": "string (可选, 暂未使用)",
  "preferred_region": "string (可选, 首选上游选择的区域)",
  "strategy": "latency_first/cost_first/reliability_first/balanced (可选)",
  "exclude_providers": ["string"] (可选, 要排除的提供商ID列表)
}
```

**响应**:
```json
{
  "logical_model": "string",
  "selected_upstream": {
    "provider_id": "string",
    "model_id": "string",
    "region": "string | null",
    "cost_input": 0.0,
    "cost_output": 0.0,
    "enabled": true,
    "weight": 1.0
  },
  "decision_time": 10.0,
  "reasoning": "string",
  "alternative_upstreams": [],
  "strategy_used": "string",
  "all_candidates": [
    {
      "upstream": {
        "provider_id": "string",
        "model_id": "string",
        "region": "string | null",
        "cost_input": 0.0,
        "cost_output": 0.0,
        "enabled": true,
        "weight": 1.0
      },
      "score": 0.99,
      "metrics": {
        "logical_model": "string",
        "provider_id": "string",
        "success_rate": 0.99,
        "avg_latency_ms": 100,
        "p95_latency_ms": 200,
        "p99_latency_ms": 300,
        "last_success": 1234567890.0,
        "last_failure": 1234567890.0,
        "consecutive_failures": 0,
        "total_requests": 1000,
        "total_failures": 10,
        "window_start": 1234567890.0,
        "window_duration": 300.0
      }
    }
  ]
}
```

**错误响应**:
- 404: 逻辑模型不存在
- 503: 没有可用的上游
- 503: 逻辑模型已禁用

---

## 会话管理

### 1. 获取会话信息

**接口**: `GET /routing/sessions/{conversation_id}`

**描述**: 获取会话信息。

**认证**: API密钥

**响应**:
```json
{
  "conversation_id": "string",
  "logical_model": "string",
  "provider_id": "string",
  "model_id": "string",
  "created_at": 1234567890.0,
  "last_used_at": 1234567890.0
}
```

**错误响应**:
- 404: 会话不存在

---

### 2. 删除会话

**接口**: `DELETE /routing/sessions/{conversation_id}`

**描述**: 删除会话（取消粘性）。

**认证**: API密钥

**成功响应**: 204 No Content

**错误响应**:
- 404: 会话不存在

---

## 系统管理

### 1. 生成系统主密钥

**接口**: `POST /system/secret-key/generate`

**描述**: 生成系统主密钥。

**认证**: JWT 令牌 (仅限超级用户)

**请求体**:
```json
{
  "length": 64 (可选, 范围32-256, 默认64)
}
```

**响应**:
```json
{
  "secret_key": "string"
}
```

**错误响应**:
- 403: 只有超级管理员可以生成系统密钥
- 500: 生成密钥失败

---

### 2. 初始化系统管理员

**接口**: `POST /system/admin/init`

**描述**: 初始化系统管理员账户。

**请求体**:
```json
{
  "username": "string (3-50字符)",
  "email": "string",
  "display_name": "System Administrator (可选)"
}
```

**响应**:
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "api_key": "string"
}
```

**错误响应**:
- 400: 系统已有用户或初始化失败
- 500: 初始化失败

---

### 3. 轮换系统主密钥

**接口**: `POST /system/secret-key/rotate`

**描述**: 轮换系统主密钥（警告：这将使所有现有的密码哈希和API密钥失效！）。

**认证**: JWT 令牌 (仅限超级用户)

**响应**:
```json
{
  "secret_key": "string"
}
```

**错误响应**:
- 403: 只有超级管理员可以轮换系统密钥
- 500: 轮换密钥失败

---

### 4. 验证密钥强度

**接口**: `POST /system/key/validate`

**描述**: 验证密钥强度。

**请求体**:
```json
{
  "key": "string"
}
```

**响应**:
```json
{
  "is_valid": true/false,
  "message": "string"
}
```

---

### 5. 获取系统状态

**接口**: `GET /system/status`

**描述**: 获取系统状态。

**认证**: JWT 令牌 (仅限超级用户)

**响应**:
```json
{
  "status": "healthy",
  "message": "系统运行正常"
}
```

**错误响应**:
- 403: 只有超级管理员可以查看系统状态

---

## 认证方式

### JWT 令牌认证

对于需要 JWT 令牌认证的 API，需要在请求头中添加：

```
Authorization: Bearer {access_token}
```

### API 密钥认证

对于需要 API 密钥认证的 API，需要在请求头中添加：

```
X-API-Key: {api_key}
```

---

## 错误响应格式

所有错误响应都遵循以下格式：

```json
{
  "detail": "错误描述"
}
```

---

## 响应状态码

- `200 OK`: 请求成功
- `201 Created`: 资源创建成功
- `204 No Content`: 请求成功，无内容返回
- `400 Bad Request`: 请求参数错误
- `401 Unauthorized`: 未认证
- `403 Forbidden`: 无权限
- `404 Not Found`: 资源不存在
- `429 Too Many Requests`: 请求频率超限
- `500 Internal Server Error`: 服务器内部错误
- `503 Service Unavailable`: 服务不可用