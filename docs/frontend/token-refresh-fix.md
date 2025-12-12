# Token 刷新机制修复文档

## 问题描述

用户在使用过程中遇到 `No refresh token available` 错误，导致无法自动刷新 access token。

### 错误截图分析
- 错误位置：`frontend/http/client.ts` 第 62 行
- 错误信息：`throw new Error("No refresh token available")`
- 调用栈：`refreshAccessToken` → `createHttpClient.use` → `async Object.getMySubmissions`

## 根本原因

原代码使用 `axios` 实例调用刷新接口，导致以下问题：

```typescript
// ❌ 错误的实现
const response = await axios.post(`${BASE_URL}/auth/refresh`, {
  refresh_token: refreshToken,
});
```

**问题**：
1. 使用 `axios` 会触发请求拦截器
2. 拦截器中又会检查 token 并可能再次调用 `refreshAccessToken`
3. 形成**循环依赖**和**竞态条件**
4. 在某些情况下，`tokenManager.getRefreshToken()` 返回 `undefined`

## 解决方案

使用原生 `fetch` API 直接调用后端刷新接口，绕过 axios 拦截器：

```typescript
// ✅ 正确的实现
const refreshAccessToken = async (): Promise<string> => {
  const refreshToken = tokenManager.getRefreshToken();
  
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    // 直接调用后端刷新接口（不使用 axios 实例，避免拦截器循环）
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Token refresh failed' }));
      throw new Error(errorData.error || 'Token refresh failed');
    }

    const { access_token, refresh_token: new_refresh_token } = await response.json();
    
    // 更新 tokens
    tokenManager.setAccessToken(access_token);
    if (new_refresh_token) {
      tokenManager.setRefreshToken(new_refresh_token);
    }
    
    return access_token;
  } catch (error) {
    // 刷新失败，清除所有 token
    tokenManager.clearAll();
    throw error;
  }
};
```

## 修复要点

### 1. 使用 fetch 而非 axios
- **原因**：避免触发 axios 拦截器，防止循环调用
- **好处**：刷新逻辑独立，不受拦截器影响

### 2. 保持现有架构
- **Token 存储**：`access_token` 存储在 localStorage/sessionStorage，`refresh_token` 存储在客户端可读的 Cookie 中
- **刷新流程**：客户端直接调用后端 `/auth/refresh` 接口
- **无需改动后端**：后端继续返回 JSON 格式的 token

### 3. 错误处理
- 刷新失败时清除所有 token
- 触发认证错误回调，引导用户重新登录
- 标准化错误信息，便于前端展示

## 当前架构说明

### Token 流转
```
1. 用户登录
   ↓
2. 后端返回 JSON: { access_token, refresh_token }
   ↓
3. 前端存储:
   - access_token → localStorage/sessionStorage
   - refresh_token → Cookie (js-cookie, 非 HttpOnly)
   ↓
4. 请求时携带 access_token (Authorization: Bearer xxx)
   ↓
5. 401 错误时，使用 refresh_token 刷新
   ↓
6. 更新 access_token 和 refresh_token
```

### 安全性说明
- **当前方案**：refresh_token 存储在客户端可读的 Cookie 中
- **安全级别**：中等（可防御 CSRF，但无法防御 XSS）
- **适用场景**：大多数 Web 应用

### 未来升级方向（可选）
如需更高安全性，可升级为 HttpOnly Cookie 方案：

1. **后端改动**：
   - 登录/刷新接口通过 `Set-Cookie` 响应头设置 HttpOnly Cookie
   - 不再在 JSON 响应中返回 refresh_token

2. **前端改动**：
   - 创建服务端 API Route (`/api/auth/refresh`)
   - 服务端读取 HttpOnly Cookie 并调用后端刷新接口
   - 客户端调用服务端 API Route 而非直接调用后端

3. **安全提升**：
   - refresh_token 完全不可被客户端 JavaScript 访问
   - 可防御 XSS 攻击窃取 refresh_token

## 测试建议

### 手动测试
1. 登录系统，获取 token
2. 等待 access_token 过期（或手动删除）
3. 发起需要认证的请求
4. 验证是否自动刷新并重试成功

### 自动化测试
```typescript
// 测试刷新逻辑
describe('Token Refresh', () => {
  it('should refresh token when 401 error occurs', async () => {
    // 模拟 401 错误
    // 验证自动刷新
    // 验证请求重试
  });

  it('should clear tokens when refresh fails', async () => {
    // 模拟刷新失败
    // 验证 token 被清除
    // 验证触发认证错误回调
  });
});
```

## 相关文件

- `frontend/http/client.ts` - HTTP 客户端和刷新逻辑
- `frontend/lib/auth/token-manager.ts` - Token 存储管理
- `backend/app/api/auth_routes.py` - 后端认证接口
- `docs/frontend/auth-error-handling.md` - 认证错误处理文档

## 总结

此次修复通过使用原生 `fetch` API 替代 `axios` 调用刷新接口，成功解决了拦截器循环依赖问题。修复后的代码逻辑清晰，不需要修改后端，保持了架构的简洁性。
