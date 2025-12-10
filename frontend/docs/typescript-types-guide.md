# TypeScript 类型定义使用指南

本文档说明前端项目中 TypeScript 类型定义的组织结构和使用规范。

## 类型定义文件结构

```
frontend/lib/
├── api-types.ts           # API 响应和请求类型
├── component-types.ts     # 组件 Props 类型
└── swr/
    └── types.ts          # SWR Hooks 返回类型
```

## 1. API 类型定义 (`lib/api-types.ts`)

### 用途
定义所有与后端 API 交互的数据类型，包括：
- 请求参数类型
- 响应数据类型
- 枚举类型
- 查询参数类型

### 命名规范
- 接口名称使用 PascalCase
- 请求类型以 `Request` 结尾，如 `CreateApiKeyRequest`
- 响应类型以 `Response` 结尾，如 `UserAvailableProvidersResponse`
- 枚举类型使用 `type` 定义，如 `type ProviderStatus = 'healthy' | 'degraded' | 'down'`

### 示例

```typescript
// 实体类型
export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  expiry_type: 'week' | 'month' | 'year' | 'never';
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// 请求类型
export interface CreateApiKeyRequest {
  name: string;
  expiry?: 'week' | 'month' | 'year' | 'never';
  allowed_provider_ids?: string[];
}

// 响应类型
export interface ApiKeysListResponse {
  items: ApiKey[];
  total: number;
}
```

## 2. 组件 Props 类型 (`lib/component-types.ts`)

### 用途
定义所有 React 组件的 Props 接口，确保组件使用的类型安全。

### 命名规范
- Props 接口名称以组件名 + `Props` 结尾
- 使用 PascalCase 命名
- 回调函数使用明确的类型定义

### 示例

```typescript
import type { ApiKey } from './api-types';

export interface ApiKeysTableProps {
  apiKeys: ApiKey[];
  loading: boolean;
  onEdit: (apiKey: ApiKey) => void;
  onDelete: (keyId: string) => Promise<void>;
  onCreate: () => void;
}

// 通用回调类型
export type OnSuccessCallback = () => void;
export type OnErrorCallback = (error: Error) => void;
export type OnChangeCallback<T> = (value: T) => void;
```

### 在组件中使用

```typescript
import type { ApiKeysTableProps } from '@/lib/component-types';

export function ApiKeysTable({
  apiKeys,
  loading,
  onEdit,
  onDelete,
  onCreate,
}: ApiKeysTableProps) {
  // 组件实现
}
```

## 3. SWR Hooks 类型 (`lib/swr/types.ts`)

### 用途
定义 SWR hooks 的标准返回类型和配置选项。

### 标准返回类型

```typescript
// 基础返回类型
export interface BaseSWRReturn<T> {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  mutate: KeyedMutator<T>;
}

// 列表返回类型
export interface ListSWRReturn<T> {
  items: T[];
  total?: number;
  isLoading: boolean;
  error: Error | undefined;
  mutate: KeyedMutator<T[]>;
}

// 带操作方法的返回类型
export interface ListSWRReturnWithActions<T, CreateData = any, UpdateData = any> {
  items: T[];
  isLoading: boolean;
  error: Error | undefined;
  mutate: KeyedMutator<T[]>;
  create: (data: CreateData) => Promise<T>;
  update: (id: string, data: UpdateData) => Promise<T>;
  remove: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}
```

### 在 Hook 中使用

```typescript
import type { ListSWRReturn } from './types';
import type { ApiKey } from '@/lib/api-types';

export function useApiKeys(userId: string): ListSWRReturn<ApiKey> {
  const { data, error, isLoading, mutate } = useSWR<ApiKey[]>(
    `/users/${userId}/api-keys`,
    fetcher
  );

  return {
    items: data || [],
    isLoading,
    error,
    mutate,
  };
}
```

## 4. 回调函数类型定义

### 标准回调类型

```typescript
// 成功回调
export type OnSuccessCallback = () => void;

// 错误回调
export type OnErrorCallback = (error: Error) => void;

// 值变更回调
export type OnChangeCallback<T> = (value: T) => void;

// 提交回调
export type OnSubmitCallback<T> = (data: T) => void | Promise<void>;

// 删除回调
export type OnDeleteCallback = (id: string) => void | Promise<void>;

// 编辑回调
export type OnEditCallback<T> = (item: T) => void;

// 刷新回调
export type OnRefreshCallback = () => void | Promise<void>;
```

### 使用示例

```typescript
import type { OnSuccessCallback, OnDeleteCallback } from '@/lib/component-types';

interface MyComponentProps {
  onSuccess?: OnSuccessCallback;
  onDelete: OnDeleteCallback;
}

export function MyComponent({ onSuccess, onDelete }: MyComponentProps) {
  const handleDelete = async (id: string) => {
    await onDelete(id);
    onSuccess?.();
  };

  return <div>...</div>;
}
```

## 5. 类型导入规范

### 导入顺序
1. React 相关类型
2. 第三方库类型
3. 项目内部类型（API、组件、SWR）
4. 相对路径类型

### 示例

```typescript
import type { ReactNode } from 'react';
import type { KeyedMutator } from 'swr';
import type { ApiKey, CreateApiKeyRequest } from '@/lib/api-types';
import type { ApiKeysTableProps } from '@/lib/component-types';
import type { ListSWRReturn } from '@/lib/swr/types';
```

## 6. 可选属性和必需属性

### 规范
- 必需属性不使用 `?`
- 可选属性使用 `?`
- 回调函数通常是可选的（除非组件必须依赖它）
- 数据属性通常是必需的

### 示例

```typescript
export interface MyComponentProps {
  // 必需属性
  data: ApiKey[];
  loading: boolean;
  
  // 可选属性
  title?: string;
  className?: string;
  
  // 可选回调
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  
  // 必需回调（组件依赖）
  onSubmit: (data: FormData) => Promise<void>;
}
```

## 7. 泛型类型使用

### 何时使用泛型
- 组件可以处理多种数据类型时
- Hook 返回类型需要灵活时
- 工具函数需要类型推断时

### 示例

```typescript
// 泛型表格组件
export interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
}

// 泛型 Hook
export function useList<T>(url: string): ListSWRReturn<T> {
  // 实现
}

// 使用
const { items } = useList<ApiKey>('/api-keys');
```

## 8. 类型断言和类型守卫

### 避免使用 `any`
```typescript
// ❌ 不好
const data: any = response.data;

// ✅ 好
const data = response.data as ApiKey;
// 或
const data: ApiKey = response.data;
```

### 使用类型守卫
```typescript
function isApiKey(obj: any): obj is ApiKey {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'key_prefix' in obj
  );
}

// 使用
if (isApiKey(data)) {
  // TypeScript 知道 data 是 ApiKey 类型
  console.log(data.name);
}
```

## 9. 联合类型和交叉类型

### 联合类型
```typescript
// 状态可以是多个值之一
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// 数据可以是多种类型之一
export type ResponseData = ApiKey | Provider | User;
```

### 交叉类型
```typescript
// 组合多个类型
export type ExtendedApiKey = ApiKey & {
  isExpired: boolean;
  daysUntilExpiry: number;
};

// 扩展 Props
export type ExtendedTableProps<T> = TableProps<T> & {
  exportable: boolean;
  onExport?: () => void;
};
```

## 10. 最佳实践

### ✅ 推荐做法

1. **始终定义 Props 类型**
   ```typescript
   // ✅ 好
   interface MyComponentProps {
     title: string;
     count: number;
   }
   
   export function MyComponent({ title, count }: MyComponentProps) {
     // ...
   }
   ```

2. **使用类型导入**
   ```typescript
   // ✅ 好
   import type { ApiKey } from '@/lib/api-types';
   
   // ❌ 避免
   import { ApiKey } from '@/lib/api-types';
   ```

3. **明确回调函数类型**
   ```typescript
   // ✅ 好
   onDelete: (id: string) => Promise<void>;
   
   // ❌ 避免
   onDelete: Function;
   ```

4. **使用可选链和空值合并**
   ```typescript
   // ✅ 好
   const name = user?.display_name ?? user?.username ?? 'Unknown';
   
   // ❌ 避免
   const name = user && user.display_name ? user.display_name : 'Unknown';
   ```

### ❌ 避免的做法

1. **不要使用 `any`**
   ```typescript
   // ❌ 避免
   const data: any = response.data;
   
   // ✅ 好
   const data: ApiKey = response.data;
   ```

2. **不要省略返回类型**
   ```typescript
   // ❌ 避免
   function fetchData(id: string) {
     return apiClient.get(`/data/${id}`);
   }
   
   // ✅ 好
   function fetchData(id: string): Promise<ApiKey> {
     return apiClient.get(`/data/${id}`);
   }
   ```

3. **不要在组件内定义类型**
   ```typescript
   // ❌ 避免
   export function MyComponent() {
     interface Props {
       title: string;
     }
     // ...
   }
   
   // ✅ 好 - 在组件外定义
   interface MyComponentProps {
     title: string;
   }
   
   export function MyComponent({ title }: MyComponentProps) {
     // ...
   }
   ```

## 11. 类型检查工具

### 使用 TypeScript 编译器
```bash
# 检查类型错误
npx tsc --noEmit

# 监听模式
npx tsc --noEmit --watch
```

### 在 IDE 中启用严格模式
确保 `tsconfig.json` 中启用了严格模式：
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true
  }
}
```

## 总结

遵循这些类型定义规范可以：
- ✅ 提高代码的类型安全性
- ✅ 减少运行时错误
- ✅ 改善 IDE 的自动补全和提示
- ✅ 使代码更易于维护和重构
- ✅ 提供更好的文档和代码可读性
