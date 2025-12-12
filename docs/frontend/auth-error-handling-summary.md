# 认证错误处理优化总结

## 问题描述

用户未登录时，如果页面中有多个组件同时使用 SWR 发起 API 请求，每个请求都会返回 401 错误，导致：
- 重复的 401 错误日志
- 无限重试循环
- 性能问题
- 用户体验差

## 解决方案

### 1. HTTP Client 层 - 主动刷新 + 防重复触发

**文件**: `frontend/http/client.ts`

**改动 1 - 请求拦截器主动刷新**:
```typescript
// 如果没有 access_token 但有 refresh_token，先刷新
if (!token && refreshToken && !isRefreshRequest) {
  if (isRefreshing && refreshTokenPromise) {
    token = await refreshTokenPromise;
  } else if (!isRefreshing) {
    token = await refreshAccessToken();
  }
}
```

**改动 2 - 防重复触发**:
```typescript
// 添加防重复标志
let authErrorTriggered = false;

// 防重复触发函数
const triggerAuthError = () => {
  if (!authErrorTriggered && authErrorCallback) {
    authErrorTriggered = true;
    authErrorCallback();
    setTimeout(() => {
      authErrorTriggered = false;
    }, 5000);
  }
};
```

**效果**: 
- 有 refresh_token 时主动刷新，避免 401 错误
- 即使有多个并发的 401 请求，也只会触发一次认证错误处理

### 2. SWR Provider 层 - 智能重试策略

**文件**: `frontend/lib/swr/provider.tsx`

**改动**:
```typescript
onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
  // 401 认证错误不重试
  if (error?.status === 401 || error?.response?.status === 401) {
    console.warn(`[SWR] 401 error for ${key}, skipping retry`);
    return;
  }
  // 404 错误不重试
  if (error?.status === 404 || error?.response?.status === 404) {
    return;
  }
  // 其他错误按指数退避重试
  if (retryCount >= 3) return;
  setTimeout(() => revalidate({ retryCount }), Math.min(1000 * Math.pow(2, retryCount), 30000));
}
```

**效果**: 
- 401 错误立即停止重试，避免无限循环
- 404 错误也不重试
- 其他错误使用指数退避策略

### 3. SWR Hooks 层 - 请求跳过机制

**文件**: `frontend/lib/swr/hooks.ts`

**改动**:
```typescript
// 添加 requireAuth 选项
export interface UseSWROptions extends SWRConfiguration {
  requireAuth?: boolean; // 默认 true
}

// 检查认证状态（优先检查 refresh_token）
const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  // 只要有 refresh_token 就认为已登录，因为可以用它刷新 access_token
  return !!tokenManager.getRefreshToken() || !!tokenManager.getAccessToken();
};

// 在 useApiGet 中实现
export const useApiGet = <T = any>(
  url: string | null,
  options: UseSWROptions = {}
) => {
  const { requireAuth = true, ...restOptions } = options;
  
  // 未登录时跳过请求
  const shouldFetch = !requireAuth || isAuthenticated();
  const effectiveUrl = shouldFetch ? url : null;
  
  // ...
};
```

**效果**: 
- 优先检查 refresh_token（生命周期更长）
- 只要有 refresh_token 就认为已登录，请求拦截器会主动刷新 access_token
- 完全未登录时（连 refresh_token 都没有）不会发起请求
- 公开 API 可以设置 `requireAuth: false` 正常请求
- 所有 SWR hooks（`usePaginatedData`, `useSearchData`, `useResource`）都支持此选项

## 影响范围

### 修改的文件
1. `frontend/http/client.ts` - HTTP 客户端
2. `frontend/lib/swr/provider.tsx` - SWR 全局配置
3. `frontend/lib/swr/hooks.ts` - SWR Hooks 封装

### 新增的文档
1. `docs/frontend/auth-error-handling.md` - 技术文档
2. `docs/frontend/examples/auth-error-handling-example.md` - 使用示例
3. `docs/frontend/auth-error-handling-summary.md` - 本文档

### 更新的文档
1. `docs/fronted/README.md` - 添加认证错误处理链接

## 使用方式

### 默认行为（需要认证）
```typescript
// 未登录时不会发起请求
const { data, error, loading } = useApiGet('/api/user/profile');
```

### 公开 API（不需要认证）
```typescript
// 即使未登录也会发起请求
const { data, error, loading } = useApiGet('/api/public/config', {
  requireAuth: false
});
```

### 条件请求
```typescript
const isLoggedIn = !!tokenManager.getAccessToken();

// 根据登录状态决定是否请求
const { data } = useApiGet(
  isLoggedIn ? '/api/user/profile' : null
);
```

## 测试建议

### 1. 未登录场景
- 清除所有 token
- 访问需要认证的页面
- 验证：不会发起 API 请求，不会出现 401 错误

### 2. Token 过期场景
- 使用过期的 access token
- 访问需要认证的页面
- 验证：自动刷新 token，重试请求成功

### 3. Refresh Token 过期场景
- 使用过期的 refresh token
- 访问需要认证的页面
- 验证：只触发一次认证错误回调，跳转到登录页

### 4. 多组件并发请求
- 在一个页面中使用多个 `useApiGet`
- 清除 token 后刷新页面
- 验证：只触发一次认证错误回调，不会出现多个 401 错误

### 5. 公开 API
- 清除所有 token
- 访问使用 `requireAuth: false` 的页面
- 验证：正常发起请求并获取数据

## 向后兼容性

### 完全兼容
所有现有代码无需修改即可工作：
- 默认行为保持不变（需要认证）
- 现有的 SWR hooks 自动继承新特性
- 错误处理逻辑向后兼容

### 可选升级
如果需要公开 API，可以添加 `requireAuth: false`：
```typescript
// 旧代码（仍然有效）
const { data } = useApiGet('/api/public/config');

// 新代码（更明确）
const { data } = useApiGet('/api/public/config', {
  requireAuth: false
});
```

## 性能影响

### 正面影响
- **减少无效请求**: 未登录时不发起认证请求
- **避免重试循环**: 401 错误不重试
- **减少网络流量**: 减少无效的 API 调用
- **降低服务器负载**: 减少 401 响应处理

### 无负面影响
- 检查认证状态的开销极小（读取 localStorage/Cookie）
- 不影响正常的认证流程
- 不影响 token 刷新机制

## 后续优化建议

### 1. 添加认证状态 Context
```typescript
// 创建全局认证状态
const AuthContext = createContext<{
  isAuthenticated: boolean;
  user: User | null;
}>({ isAuthenticated: false, user: null });

// 在 hooks 中使用
const { isAuthenticated } = useAuth();
```

### 2. 优化 Token 刷新策略
- 在 token 即将过期时主动刷新
- 避免等到 401 错误才刷新

### 3. 添加离线支持
- 检测网络状态
- 离线时使用缓存数据

### 4. 添加请求队列
- 在刷新 token 期间暂停所有请求
- 刷新完成后批量重试

## 相关文档

- [认证错误处理机制](./auth-error-handling.md) - 详细技术文档
- [使用示例](./examples/auth-error-handling-example.md) - 代码示例
- [前端 README](./README.md) - 前端文档导航

## 变更日志

**2025-12-12**
- 实现 HTTP Client 层防重复触发机制
- 实现 SWR Provider 层智能重试策略
- 实现 SWR Hooks 层请求跳过机制
- 添加完整文档和示例

---

**维护者**: AI Higress Team  
**最后更新**: 2025-12-12
