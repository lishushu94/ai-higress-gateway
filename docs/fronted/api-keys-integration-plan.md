# API Keys 前端集成实施计划

## 概述
将前端 Dashboard 的 API Key 页面接入后端 API，使用封装好的 SWR 进行请求，并添加创建和更新的 Dialog。

## 当前状态分析

### ✅ 已完成
1. **后端 API** - 完整的 API Key CRUD 接口已实现
   - `POST /users/{user_id}/api-keys` - 创建 API Key
   - `GET /users/{user_id}/api-keys` - 获取 API Key 列表
   - `PUT /users/{user_id}/api-keys/{key_id}` - 更新 API Key
   - `DELETE /users/{user_id}/api-keys/{key_id}` - 删除 API Key
   - 提供商限制相关接口

2. **HTTP 服务层** - `frontend/http/api-key.ts` 已实现
   - 包含所有必要的接口定义和服务方法
   - 类型定义完整（`ApiKey`, `CreateApiKeyRequest`, `UpdateApiKeyRequest`）

3. **SWR 基础设施** - `frontend/lib/swr/hooks.ts` 已实现
   - `useApiGet` - GET 请求
   - `useApiPost` - POST 请求
   - `useApiPut` - PUT 请求
   - `useApiDelete` - DELETE 请求

4. **UI 组件库** - shadcn/ui 组件已就绪
   - Dialog, Input, Select, Button, Table 等

5. **认证系统** - JWT 认证已实现
   - `useAuthStore` 提供用户信息
   - `httpClient` 自动处理 token

### 🔨 需要实现

## 实施步骤

### 步骤 1: 更新类型定义
**文件**: `frontend/lib/api-types.ts`

添加 API Key 相关类型（从 `http/api-key.ts` 导出）：
```typescript
export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  expiry_type: 'week' | 'month' | 'year' | 'never';
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  has_provider_restrictions: boolean;
  allowed_provider_ids: string[];
  token?: string; // 仅在创建时返回
}

export interface CreateApiKeyRequest {
  name: string;
  expiry?: 'week' | 'month' | 'year' | 'never';
  allowed_provider_ids?: string[];
}

export interface UpdateApiKeyRequest {
  name?: string;
  expiry?: 'week' | 'month' | 'year' | 'never';
  allowed_provider_ids?: string[];
}
```

### 步骤 2: 创建专用 SWR Hooks
**文件**: `frontend/lib/swr/use-api-keys.ts`

```typescript
import { useApiGet, useApiPost, useApiPut, useApiDelete } from './hooks';
import { apiKeyService, type ApiKey, type CreateApiKeyRequest, type UpdateApiKeyRequest } from '@/http/api-key';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useCallback } from 'react';

export const useApiKeys = () => {
  const user = useAuthStore(state => state.user);
  const userId = user?.id;

  // 获取 API Keys 列表
  const {
    data: apiKeys,
    error,
    loading,
    refresh
  } = useApiGet<ApiKey[]>(
    userId ? `/users/${userId}/api-keys` : null,
    { strategy: 'frequent' }
  );

  // 创建 API Key
  const createMutation = useApiPost<ApiKey, CreateApiKeyRequest>(
    userId ? `/users/${userId}/api-keys` : ''
  );

  // 更新 API Key
  const updateMutation = useApiPut<ApiKey, UpdateApiKeyRequest>(
    userId ? `/users/${userId}/api-keys` : ''
  );

  // 删除 API Key
  const deleteMutation = useApiDelete(
    userId ? `/users/${userId}/api-keys` : ''
  );

  // 创建 API Key
  const createApiKey = useCallback(async (data: CreateApiKeyRequest) => {
    if (!userId) throw new Error('User not authenticated');
    const result = await createMutation.trigger(data);
    await refresh();
    return result;
  }, [userId, createMutation, refresh]);

  // 更新 API Key
  const updateApiKey = useCallback(async (keyId: string, data: UpdateApiKeyRequest) => {
    if (!userId) throw new Error('User not authenticated');
    const result = await updateMutation.trigger(data);
    await refresh();
    return result;
  }, [userId, updateMutation, refresh]);

  // 删除 API Key
  const deleteApiKey = useCallback(async (keyId: string) => {
    if (!userId) throw new Error('User not authenticated');
    await deleteMutation.trigger();
    await refresh();
  }, [userId, deleteMutation, refresh]);

  return {
    apiKeys: apiKeys || [],
    loading,
    error,
    refresh,
    createApiKey,
    updateApiKey,
    deleteApiKey,
    creating: createMutation.submitting,
    updating: updateMutation.submitting,
    deleting: deleteMutation.submitting,
  };
};
```

### 步骤 3: 创建 API Key Dialog 组件
**文件**: `frontend/components/dashboard/api-keys/api-key-dialog.tsx`

功能需求：
- 支持创建和编辑模式
- 表单字段：
  - 名称（必填）
  - 过期时间（week/month/year/never）
  - 允许的提供商（多选，可选）
- 创建成功后显示完整 token（仅一次）
- 表单验证
- 加载状态

关键特性：
```typescript
interface ApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  apiKey?: ApiKey; // 编辑模式时传入
  onSuccess?: (apiKey: ApiKey) => void;
}
```

### 步骤 4: 重构 API Keys Table 组件
**文件**: `frontend/components/dashboard/api-keys/api-keys-table.tsx`

更新需求：
- 使用 `useApiKeys` hook 获取真实数据
- 显示字段：
  - 名称
  - Key Prefix（前12位）
  - 创建时间
  - 过期时间
  - 提供商限制状态
  - 操作按钮（复制、编辑、删除）
- 复制功能（复制 key prefix，提示用户完整 key 仅在创建时显示）
- 删除确认对话框
- 空状态处理
- 加载状态

### 步骤 5: 创建 Token 显示 Dialog
**文件**: `frontend/components/dashboard/api-keys/token-display-dialog.tsx`

功能：
- 仅在创建成功后显示一次
- 显示完整 token
- 复制按钮
- 安全提示（token 仅显示一次）
- 关闭后无法再次查看

### 步骤 6: 创建提供商选择组件
**文件**: `frontend/components/dashboard/api-keys/provider-selector.tsx`

功能：
- 多选下拉框
- 从 `/providers` 接口获取提供商列表
- 显示提供商名称和 ID
- 支持搜索过滤
- 可选功能（留空表示无限制）

### 步骤 7: 创建主页面组件
**文件**: `frontend/app/dashboard/api-keys/page.tsx`

整合所有组件：
```typescript
export default function ApiKeysPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedKey, setSelectedKey] = useState<ApiKey | undefined>();
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [newToken, setNewToken] = useState<string>('');

  const {
    apiKeys,
    loading,
    createApiKey,
    updateApiKey,
    deleteApiKey,
  } = useApiKeys();

  // 处理创建
  const handleCreate = () => {
    setDialogMode('create');
    setSelectedKey(undefined);
    setDialogOpen(true);
  };

  // 处理编辑
  const handleEdit = (apiKey: ApiKey) => {
    setDialogMode('edit');
    setSelectedKey(apiKey);
    setDialogOpen(true);
  };

  // 处理创建成功
  const handleCreateSuccess = (apiKey: ApiKey) => {
    if (apiKey.token) {
      setNewToken(apiKey.token);
      setTokenDialogOpen(true);
    }
    setDialogOpen(false);
  };

  return (
    <div>
      <ApiKeysTable
        apiKeys={apiKeys}
        loading={loading}
        onEdit={handleEdit}
        onDelete={deleteApiKey}
        onCreate={handleCreate}
      />
      
      <ApiKeyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        apiKey={selectedKey}
        onSuccess={handleCreateSuccess}
      />
      
      <TokenDisplayDialog
        open={tokenDialogOpen}
        onOpenChange={setTokenDialogOpen}
        token={newToken}
      />
    </div>
  );
}
```

## 技术要点

### 1. 提供商选择实现
```typescript
// 使用 SWR 获取提供商列表
const { data: providers } = useApiGet<Provider[]>('/providers');

// 在表单中使用 shadcn Select 组件
<Select multiple value={selectedProviders} onValueChange={setSelectedProviders}>
  {providers?.map(p => (
    <SelectItem key={p.id} value={p.id}>
      {p.name} ({p.id})
    </SelectItem>
  ))}
</Select>
```

### 2. Token 安全处理
- 完整 token 仅在创建时返回一次
- 后续只显示 key_prefix（前12位）
- 创建成功后立即显示 token dialog
- 提供复制功能和安全提示

### 3. 日期格式化
```typescript
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const formatDate = (dateString: string) => {
  return formatDistanceToNow(new Date(dateString), {
    addSuffix: true,
    locale: zhCN
  });
};
```

### 4. 错误处理
- 使用 toast 显示错误信息
- 表单验证错误
- API 请求错误
- 网络错误

### 5. 加载状态
- 列表加载骨架屏
- 按钮加载状态
- Dialog 提交加载状态

## UI/UX 设计要点

### 1. 表格设计
- 响应式布局
- 悬停效果
- 操作按钮分组
- 空状态友好提示

### 2. Dialog 设计
- 清晰的标题和描述
- 表单字段分组
- 必填字段标识
- 提交按钮禁用逻辑

### 3. Token 显示
- 醒目的警告提示
- 大字体显示 token
- 一键复制功能
- 复制成功反馈

### 4. 提供商选择
- 搜索功能
- 已选项显示
- 清除选择按钮
- 无限制选项说明

## 测试清单

### 功能测试
- [ ] 创建 API Key（无提供商限制）
- [ ] 创建 API Key（有提供商限制）
- [ ] 查看 API Key 列表
- [ ] 编辑 API Key 名称
- [ ] 编辑 API Key 过期时间
- [ ] 编辑 API Key 提供商限制
- [ ] 删除 API Key
- [ ] 复制 Key Prefix
- [ ] Token 显示和复制

### 边界测试
- [ ] 空列表状态
- [ ] 加载状态
- [ ] 错误状态
- [ ] 表单验证
- [ ] 重复名称处理
- [ ] 无效提供商 ID 处理

### 用户体验测试
- [ ] 响应式布局
- [ ] 加载反馈
- [ ] 成功/失败提示
- [ ] 确认对话框
- [ ] 键盘导航

## 实施顺序

1. ✅ 分析后端接口和现有代码
2. 更新类型定义（api-types.ts）
3. 创建 SWR hooks（use-api-keys.ts）
4. 创建 Token 显示 Dialog
5. 创建提供商选择组件
6. 创建/重构 API Key Dialog
7. 重构 API Keys Table
8. 创建主页面组件
9. 集成测试
10. UI/UX 优化

## 注意事项

1. **安全性**
   - Token 仅显示一次
   - 删除操作需要确认
   - 敏感信息不记录日志

2. **性能**
   - 使用 SWR 缓存策略
   - 列表分页（如果数据量大）
   - 防抖搜索

3. **可访问性**
   - 键盘导航支持
   - 屏幕阅读器友好
   - 适当的 ARIA 标签

4. **国际化**
   - 所有文本使用中文
   - 日期格式本地化
   - 错误信息清晰

## 相关文档

- 后端 API 文档: `docs/backend/API_Documentation.md`
- SWR 使用指南: `frontend/lib/swr/README.md`
- 组件设计规范: `frontend/docs/ui-design-examples.md`