# 前端认证错误处理机制

## 概述

本文档说明前端如何处理用户未登录时的 401 认证错误，避免无限重复请求导致的性能问题。

## 问题背景

当用户未登录或 token 过期时，如果页面中有多个组件同时使用 SWR 发起 API 请求，每个请求都会返回 401 错误。在没有适当处理的情况下，这会导致：

1. **重复的 401 错误日志**：每个组件的请求都会失败并记录错误
2. **无限重试循环**：SWR 默认会重试失败的请求，导致持续的 401 错误
3. **性能问题**：大量无效请求占用网络和服务器资源
4. **用户体验差**：页面可能出现多个错误提示

## 解决方案

### 1. HTTP Client 层面的防重复机制

在 `frontend/http/client.ts` 中实现了防止重复触发认证错误回调的机制：

```typescript
let authErrorTriggered = false; // 防止重复触发认证错误回调

const triggerAuthError = () => {
  if (!authErrorTriggered && authErrorCallback) {
    authErrorTriggered = true;
    authErrorCallback();
    // 5秒后重置标志，允许再次触发（防止永久锁定）
    setTimeout(() => {
      authErrorTriggered = false;
    }, 5000);
  }
};
```

**工作原理**：
- 使用 `authErrorTriggered` 标志位防止在短时间内重复触发认证错误回调
- 5 秒后自动重置标志，避免永久锁定（例如用户刷新页面后应该能再次触发）
- 确保即使有多个并发的 401 请求，也只会触发一次认证错误处理（如跳转到登录页）

### 1.5. 请求拦截器的主动刷新

在 `frontend/http/client.ts` 的请求拦截器中实现了主动刷新机制：

```typescript
// 如果没有 access_token 但有 refresh_token，且不是刷新请求本身，先刷新
const isRefreshRequest = config.url?.includes('/auth/refresh');
if (!token && refreshToken && !isRefreshRequest) {
  console.log('[Auth Debug] No access token but has refresh token, refreshing before request...');
  
  // 如果正在刷新，等待刷新完成
  if (isRefreshing && refreshTokenPromise) {
    token = await refreshTokenPromise;
  } else if (!isRefreshing) {
    // 开始刷新并等待完成
    token = await refreshAccessToken();
  }
}
```

**工作原理**：
- 在发送请求前检查 token 状态
- 如果只有 refresh_token 没有 access_token，主动刷新
- 避免发送会收到 401 的请求
- 提升用户体验，减少不必要的错误

### 2. SWR Provider 层面的错误重试策略

在 `frontend/lib/swr/provider.tsx` 中配置了智能的错误重试策略：

```typescript
onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
  // 401 认证错误不重试，避免无限循环
  if (error?.status === 401 || error?.response?.status === 401) {
    console.warn(`[SWR] 401 error for ${key}, skipping retry`);
    return;
  }
  
  // 404 错误不重试
  if (error?.status === 404 || error?.response?.status === 404) {
    return;
  }
  
  // 超过最大重试次数
  if (retryCount >= 3) {
    return;
  }
  
  // 其他错误按指数退避重试
  setTimeout(() => revalidate({ retryCount }), Math.min(1000 * Math.pow(2, retryCount), 30000));
}
```

**工作原理**：
- **401 错误不重试**：遇到认证错误时立即停止重试，避免无限循环
- **404 错误不重试**：资源不存在时也不重试
- **其他错误使用指数退避**：网络错误等临时问题使用指数退避策略重试（1s, 2s, 4s...最多 30s）
- **最多重试 3 次**：避免过度重试

### 3. SWR Hooks 层面的请求跳过机制

在 `frontend/lib/swr/hooks.ts` 中为所有 SWR hooks 添加了 `requireAuth` 选项：

```typescript
export interface UseSWROptions extends SWRConfiguration {
  strategy?: 'default' | 'frequent' | 'static' | 'realtime';
  params?: Record<string, any>;
  requireAuth?: boolean; // 是否需要认证，默认 true
}

// 检查是否已认证（有 token）
const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!tokenManager.getAccessToken() || !!tokenManager.getRefreshToken();
};

export const useApiGet = <T = any>(
  url: string | null,
  options: UseSWROptions = {}
) => {
  const { strategy = 'default', params, requireAuth = true, ...restOptions } = options;
  
  // 如果需要认证但用户未登录，则不发起请求
  const shouldFetch = !requireAuth || isAuthenticated();
  const effectiveUrl = shouldFetch ? url : null;
  
  // ... SWR 调用
};
```

**工作原理**：
- **默认需要认证**：`requireAuth` 默认为 `true`，大部分 API 都需要认证
- **检查 refresh_token**：优先检查 refresh_token（生命周期更长），只要有 refresh_token 就认为已登录
- **自动刷新机制**：如果只有 refresh_token 没有 access_token，请求拦截器会主动刷新
- **未登录时跳过请求**：如果需要认证但用户完全未登录（连 refresh_token 都没有），将 URL 设为 `null`，SWR 不会发起请求
- **公开 API 可选**：对于不需要认证的公开 API，可以设置 `requireAuth: false`

## 使用示例

### 需要认证的 API（默认行为）

```typescript
// 默认需要认证，未登录时不会发起请求
const { data, error, loading } = useApiGet('/api/user/profile');
```

### 公开 API（不需要认证）

```typescript
// 明确指定不需要认证，即使未登录也会发起请求
const { data, error, loading } = useApiGet('/api/public/config', {
  requireAuth: false
});
```

### 分页和搜索 Hooks

```typescript
// 分页数据，默认需要认证
const { data, total, loading } = usePaginatedData('/api/orders', {
  params: { status: 'active' }
});

// 搜索数据，不需要认证
const { data, count, loading } = useSearchData('/api/public/search', {
  requireAuth: false
});
```

### 资源管理 Hook

```typescript
// CRUD 操作，默认需要认证
const {
  data,
  loading,
  createResource,
  updateResource,
  deleteResource
} = useResource('/api/items');
```

## Token 刷新流程

### 主动刷新（请求拦截器）

当发起请求时，如果没有 access token 但有 refresh token：

1. **检测状态**：请求拦截器检测到没有 access_token 但有 refresh_token
2. **主动刷新**：在发送请求前先刷新 token
3. **等待刷新**：如果正在刷新，等待刷新完成
4. **使用新 token**：刷新成功后使用新 token 发送请求
5. **避免 401**：这样可以避免不必要的 401 错误

### 被动刷新（响应拦截器）

当 access token 过期但 refresh token 仍然有效时：

1. **首次 401 响应**：axios 拦截器捕获 401 错误
2. **检查是否为刷新请求**：如果是刷新 token 请求本身失败，清除所有 token 并触发认证错误
3. **尝试刷新 token**：使用 refresh token 请求新的 access token
4. **共享刷新 Promise**：多个并发请求共享同一个刷新 Promise，避免重复刷新
5. **重试原请求**：刷新成功后，使用新 token 重试原请求
6. **刷新失败处理**：如果刷新失败，清除所有 token，触发认证错误（只触发一次）

## 最佳实践

### 1. 合理使用 requireAuth

- **默认行为**：大部分业务 API 都需要认证，使用默认值即可
- **公开 API**：只有真正的公开 API（如配置、公告等）才设置 `requireAuth: false`
- **条件认证**：如果 API 支持可选认证（登录用户看到更多信息），可以设置 `requireAuth: false` 并在后端处理

### 2. 错误处理

```typescript
const { data, error, loading } = useApiGet('/api/user/profile');

// 使用 useErrorDisplay 统一处理错误展示
useErrorDisplay(error);

// 或者自定义错误处理
if (error) {
  if (error.status === 401) {
    // 认证错误已由全局处理，这里通常不需要额外处理
  } else {
    // 处理其他错误
  }
}
```

### 3. 登录状态检查

```typescript
import { tokenManager } from '@/lib/auth/token-manager';

// 在组件中检查登录状态
const isLoggedIn = !!tokenManager.getAccessToken();

if (!isLoggedIn) {
  // 显示登录提示或跳转到登录页
}
```

### 4. 避免在服务端组件中使用需要认证的 API

```typescript
// ❌ 错误：服务端组件无法访问客户端的 token
export default async function Page() {
  const data = await fetch('/api/user/profile'); // 会失败
  return <div>{data}</div>;
}

// ✅ 正确：在客户端组件中使用 SWR
'use client';
export default function Page() {
  const { data } = useApiGet('/api/user/profile');
  return <div>{data}</div>;
}
```

## 调试

### 开启调试日志

在浏览器控制台中可以看到：

```
[Auth Debug] 401 error detected: { url: '/api/user/profile', ... }
[Auth Debug] Starting token refresh...
[Auth Debug] Token refresh successful
[SWR] 401 error for /api/orders, skipping retry
```

### 常见问题排查

1. **无限 401 错误**：检查 SWR Provider 的 `onErrorRetry` 配置是否正确
2. **未跳转到登录页**：检查 `authErrorCallback` 是否正确设置
3. **重复跳转**：检查 `triggerAuthError` 的防重复机制是否生效
4. **请求未发起**：检查 `requireAuth` 设置和 `isAuthenticated()` 返回值

## 相关文件

- `frontend/http/client.ts` - HTTP 客户端和 401 拦截器
- `frontend/lib/swr/provider.tsx` - SWR 全局配置
- `frontend/lib/swr/hooks.ts` - SWR Hooks 封装
- `frontend/lib/auth/token-manager.ts` - Token 管理
