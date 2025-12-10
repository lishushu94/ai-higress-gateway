# 组件开发最佳实践

本文档提供了 AI Higress Gateway 前端项目中组件开发的最佳实践指南。

## 目录

1. [组件架构](#组件架构)
2. [命名规范](#命名规范)
3. [类型安全](#类型安全)
4. [性能优化](#性能优化)
5. [代码组织](#代码组织)
6. [常见模式](#常见模式)
7. [测试指南](#测试指南)

## 组件架构

### 服务端 vs 客户端组件

#### 服务端组件（默认）

服务端组件是 Next.js App Router 的默认选择，应该优先使用：

```typescript
// frontend/app/dashboard/overview/page.tsx
import { OverviewClient } from './components/overview-client';

// 这是一个服务端组件，可以使用 async/await
export default async function OverviewPage() {
  // 在服务端预取数据
  const initialData = await fetch('https://api.example.com/data')
    .then(res => res.json());
  
  return (
    <div className="space-y-8">
      <h1>概览</h1>
      {/* 将交互逻辑传递给客户端组件 */}
      <OverviewClient initialData={initialData} />
    </div>
  );
}
```

**优势**：
- 减少 JavaScript 发送到浏览器
- 直接访问后端资源（数据库、API）
- 保护敏感信息（API 密钥、令牌）
- 改善首屏加载性能

#### 客户端组件

仅在需要以下功能时使用客户端组件：
- 事件监听器（onClick、onChange 等）
- 状态管理（useState、useReducer）
- 生命周期 Hooks（useEffect、useLayoutEffect）
- 浏览器 API（localStorage、sessionStorage）

```typescript
// frontend/app/dashboard/overview/components/overview-client.tsx
'use client';

import { useState } from 'react';
import { StatsGrid } from '@/components/dashboard/overview/stats-grid';

interface OverviewClientProps {
  initialData: any;
}

export function OverviewClient({ initialData }: OverviewClientProps) {
  const [selectedTab, setSelectedTab] = useState('all');
  
  return (
    <div>
      <StatsGrid data={initialData} />
      {/* 其他交互组件 */}
    </div>
  );
}
```

### 组件大小限制

单个组件文件不应超过 200 行代码（不包括注释和空行）。

**超过 200 行时的拆分策略**：

```typescript
// ❌ 不好：单个文件超过 200 行
export function DashboardOverview() {
  // 100+ 行的统计卡片逻辑
  // 100+ 行的提供商列表逻辑
  // 总计 200+ 行
}

// ✅ 好：拆分为多个组件
// components/stats-section.tsx
export function StatsSection() {
  // 统计卡片逻辑
}

// components/providers-section.tsx
export function ProvidersSection() {
  // 提供商列表逻辑
}

// page.tsx
export default function DashboardOverview() {
  return (
    <>
      <StatsSection />
      <ProvidersSection />
    </>
  );
}
```

## 命名规范

### 文件命名

使用 kebab-case 命名文件：

```
✅ user-profile-card.tsx
✅ api-key-table.tsx
✅ provider-detail-modal.tsx

❌ UserProfileCard.tsx
❌ ApiKeyTable.tsx
❌ ProviderDetailModal.tsx
```

### 组件命名

使用 PascalCase 命名组件：

```typescript
// ✅ 好
export function UserProfileCard() {}
export const ApiKeyTable = () => {};

// ❌ 不好
export function user-profile-card() {}
export const apiKeyTable = () => {};
```

### 文件结构

```
components/
├── dashboard/
│   ├── overview/
│   │   ├── stats-grid.tsx          # 组件文件
│   │   ├── active-providers.tsx
│   │   └── recent-activity.tsx
│   └── providers/
│       ├── provider-list.tsx
│       └── provider-detail.tsx
├── forms/
│   ├── login-form.tsx
│   └── api-key-form.tsx
└── ui/                             # shadcn/ui 组件
    ├── button.tsx
    ├── input.tsx
    └── dialog.tsx
```

## 类型安全

### Props 类型定义

所有组件的 Props 必须有完整的 TypeScript 类型定义：

```typescript
// ✅ 好：完整的类型定义
interface StatCardProps {
  title: string;
  value: number | string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  icon,
  trend,
  trendValue,
  className
}: StatCardProps) {
  return (
    <div className={className}>
      {icon && <div>{icon}</div>}
      <h3>{title}</h3>
      <p className="text-2xl font-bold">{value}</p>
      {trend && <span>{trend}</span>}
    </div>
  );
}

// ❌ 不好：没有类型定义
export function StatCard(props: any) {
  return <div>{props.value}</div>;
}
```

### API 类型使用

所有 API 响应数据必须使用 `frontend/lib/api-types.ts` 中定义的类型：

```typescript
// frontend/lib/api-types.ts
export interface Provider {
  id: string;
  name: string;
  type: 'openai' | 'claude' | 'google';
  status: 'active' | 'inactive';
  createdAt: string;
}

// 在组件中使用
import { Provider } from '@/lib/api-types';

interface ProviderListProps {
  providers: Provider[];
}

export function ProviderList({ providers }: ProviderListProps) {
  return (
    <ul>
      {providers.map(provider => (
        <li key={provider.id}>{provider.name}</li>
      ))}
    </ul>
  );
}
```

### 回调函数类型

回调函数必须有明确的参数和返回值类型：

```typescript
// ✅ 好
interface FormProps {
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  onChange?: (field: string, value: any) => void;
}

// ❌ 不好
interface FormProps {
  onSubmit: any;
  onCancel: any;
  onChange?: any;
}
```

## 性能优化

### React.memo 优化

对于纯展示组件（只接收 Props，不使用 Hooks），使用 `React.memo` 避免不必要的重渲染：

```typescript
// ✅ 好：使用 memo 优化纯展示组件
export const StatCard = React.memo(function StatCard({
  title,
  value,
  icon
}: StatCardProps) {
  return (
    <div className="p-4 border rounded-lg">
      {icon && <div>{icon}</div>}
      <h3>{title}</h3>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
});

// ❌ 不好：没有优化，每次父组件更新都会重渲染
export function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <div className="p-4 border rounded-lg">
      {icon && <div>{icon}</div>}
      <h3>{title}</h3>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
```

### 动态导入

对于大型组件或非首屏必需的组件，使用 `next/dynamic` 进行动态导入：

```typescript
import dynamic from 'next/dynamic';

// 动态导入图表组件
const ProviderChart = dynamic(
  () => import('@/components/dashboard/provider-chart'),
  {
    loading: () => <ChartSkeleton />,
    ssr: false // 如果组件依赖浏览器 API
  }
);

// 动态导入对话框
const CreateApiKeyDialog = dynamic(
  () => import('@/components/dialogs/create-api-key-dialog'),
  { ssr: false }
);

export function DashboardPage() {
  return (
    <div>
      <ProviderChart />
      <CreateApiKeyDialog />
    </div>
  );
}
```

### 虚拟滚动

对于渲染超过 50 个列表项的组件，使用虚拟滚动库：

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

interface VirtualListProps {
  items: any[];
  renderItem: (item: any) => React.ReactNode;
}

export function VirtualList({ items, renderItem }: VirtualListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });
  
  return (
    <div
      ref={parentRef}
      style={{ height: '400px', overflow: 'auto' }}
    >
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map(virtualItem => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index])}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 代码组织

### 导入顺序

按以下顺序组织导入：

```typescript
// 1. React 和 Next.js 导入
import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

// 2. 第三方库导入
import { useVirtualizer } from '@tanstack/react-virtual';

// 3. 本地导入（绝对路径）
import { Button } from '@/components/ui/button';
import { useApiGet } from '@/lib/swr/use-api';
import { useI18n } from '@/lib/i18n-context';

// 4. 本地导入（相对路径）
import { StatCard } from './stat-card';
import { ChartSkeleton } from './chart-skeleton';

// 5. 类型导入
import type { Provider } from '@/lib/api-types';
```

### 常量定义

将常量定义在文件顶部或单独的常量文件中：

```typescript
// ✅ 好：常量在文件顶部
const ITEMS_PER_PAGE = 20;
const CACHE_DURATION = 3600; // 1 小时

export function DataTable() {
  // 使用常量
}

// ✅ 好：常量在单独文件中
// constants/pagination.ts
export const ITEMS_PER_PAGE = 20;
export const MAX_PAGE_SIZE = 100;

// 在组件中导入
import { ITEMS_PER_PAGE } from '@/lib/constants/pagination';
```

## 常见模式

### 容器组件 + 展示组件

将数据获取逻辑和展示逻辑分离：

```typescript
// 容器组件：负责数据获取
'use client';

import { ProviderListDisplay } from './provider-list-display';
import { useApiGet } from '@/lib/swr/use-api';

export function ProviderListContainer() {
  const { data: providers, isLoading, error } = useApiGet('/api/providers');
  
  if (error) return <ErrorDisplay error={error} />;
  if (isLoading) return <LoadingSkeleton />;
  
  return <ProviderListDisplay providers={providers} />;
}

// 展示组件：只负责渲染
interface ProviderListDisplayProps {
  providers: Provider[];
}

export function ProviderListDisplay({ providers }: ProviderListDisplayProps) {
  return (
    <ul>
      {providers.map(provider => (
        <li key={provider.id}>{provider.name}</li>
      ))}
    </ul>
  );
}
```

### 自定义 Hooks

将复杂的状态逻辑提取为自定义 Hooks：

```typescript
// lib/hooks/use-form-state.ts
import { useState, useCallback } from 'react';

interface UseFormStateOptions {
  initialValues: Record<string, any>;
  onSubmit: (values: Record<string, any>) => Promise<void>;
}

export function useFormState({
  initialValues,
  onSubmit
}: UseFormStateOptions) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleChange = useCallback((field: string, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  }, []);
  
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : '提交失败' });
    } finally {
      setIsSubmitting(false);
    }
  }, [values, onSubmit]);
  
  return {
    values,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit
  };
}

// 在组件中使用
export function LoginForm() {
  const { values, errors, isSubmitting, handleChange, handleSubmit } = useFormState({
    initialValues: { email: '', password: '' },
    onSubmit: async (values) => {
      await loginApi(values);
    }
  });
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        value={values.email}
        onChange={(e) => handleChange('email', e.target.value)}
      />
      {errors.email && <span>{errors.email}</span>}
    </form>
  );
}
```

### 条件渲染

使用清晰的条件渲染模式：

```typescript
// ✅ 好：清晰的条件渲染
export function DataDisplay({ data, isLoading, error }) {
  if (error) {
    return <ErrorDisplay error={error} />;
  }
  
  if (isLoading) {
    return <LoadingSkeleton />;
  }
  
  if (!data || data.length === 0) {
    return <EmptyState />;
  }
  
  return <DataTable data={data} />;
}

// ❌ 不好：嵌套的三元运算符
export function DataDisplay({ data, isLoading, error }) {
  return error ? (
    <ErrorDisplay error={error} />
  ) : isLoading ? (
    <LoadingSkeleton />
  ) : !data || data.length === 0 ? (
    <EmptyState />
  ) : (
    <DataTable data={data} />
  );
}
```

## 测试指南

### 单元测试

为组件编写单元测试，验证 Props 渲染和交互：

```typescript
// components/stat-card.test.tsx
import { render, screen } from '@testing-library/react';
import { StatCard } from './stat-card';

describe('StatCard', () => {
  it('renders title and value correctly', () => {
    render(<StatCard title="Total Users" value="1,234" />);
    
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });
  
  it('displays icon when provided', () => {
    const Icon = () => <span data-testid="icon">Icon</span>;
    render(<StatCard title="Test" value="100" icon={<Icon />} />);
    
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
  
  it('displays trend indicator when provided', () => {
    render(
      <StatCard
        title="Revenue"
        value="$10,000"
        trend="up"
        trendValue="+5%"
      />
    );
    
    expect(screen.getByText('+5%')).toBeInTheDocument();
  });
});
```

### Hook 测试

为自定义 Hooks 编写测试：

```typescript
// lib/hooks/use-form-state.test.ts
import { renderHook, act } from '@testing-library/react';
import { useFormState } from './use-form-state';

describe('useFormState', () => {
  it('initializes with provided values', () => {
    const { result } = renderHook(() =>
      useFormState({
        initialValues: { email: '', password: '' },
        onSubmit: async () => {}
      })
    );
    
    expect(result.current.values).toEqual({ email: '', password: '' });
  });
  
  it('updates values on change', () => {
    const { result } = renderHook(() =>
      useFormState({
        initialValues: { email: '' },
        onSubmit: async () => {}
      })
    );
    
    act(() => {
      result.current.handleChange('email', 'test@example.com');
    });
    
    expect(result.current.values.email).toBe('test@example.com');
  });
});
```

## 总结

遵循这些最佳实践可以帮助你：

- 编写更易维护的代码
- 提升应用性能
- 减少 bug 和类型错误
- 提高代码复用率
- 改善开发体验

记住：**简洁、清晰、可测试** 是好组件的三个关键特征。
