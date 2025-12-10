# 代码分割策略文档

## 概述

本文档定义了前端项目的代码分割策略，确保最优的加载性能和用户体验。

## 分割原则

### 1. 路由级分割（自动）

Next.js App Router 自动为每个页面创建独立的 chunk：

```
/dashboard/overview → chunk-overview.js
/dashboard/providers → chunk-providers.js
/dashboard/metrics → chunk-metrics.js
```

**优势：**
- 用户只下载当前页面所需的代码
- 页面切换时按需加载
- 自动优化，无需手动配置

### 2. 组件级分割（手动）

使用 `next/dynamic` 对大型组件进行分割：

#### 分割标准

**必须分割的组件：**
- 文件大小 > 50KB
- 导入大型第三方库（如 recharts）
- 非首屏必需的功能
- 条件渲染的组件（如管理面板）

**示例：**
```typescript
import dynamic from 'next/dynamic';

// 图表组件 - 大型依赖
const MetricsChart = dynamic(
  () => import('@/components/dashboard/metrics-chart'),
  {
    loading: () => <ChartSkeleton />,
    ssr: false, // 如果依赖浏览器 API
  }
);

// 对话框组件 - 条件渲染
const EditDialog = dynamic(
  () => import('./edit-dialog'),
  { ssr: false }
);
```

### 3. 依赖级分割

通过 `optimizePackageImports` 优化大型依赖：

```typescript
// next.config.ts
experimental: {
  optimizePackageImports: [
    'lucide-react',      // 图标库
    'recharts',          // 图表库
    '@radix-ui/react-*', // UI 组件
  ],
}
```



## 已实施的分割

### Dashboard 页面

#### Overview 页面
```typescript
// 统计卡片 - 轻量级，不分割
import { StatsGrid } from '@/components/dashboard/overview/stats-grid';

// 活跃提供商 - 包含图表，动态导入
const ActiveProviders = dynamic(
  () => import('@/components/dashboard/overview/active-providers'),
  { loading: () => <Skeleton /> }
);

// 最近活动 - 轻量级，不分割
import { RecentActivity } from '@/components/dashboard/overview/recent-activity';
```

#### Providers 页面
```typescript
// 提供商列表 - 使用虚拟滚动，动态导入
const ProvidersTable = dynamic(
  () => import('@/components/dashboard/providers/providers-table-virtualized'),
  { loading: () => <TableSkeleton /> }
);

// 提供商详情 - 复杂组件，动态导入
const ProviderDetail = dynamic(
  () => import('./provider-detail-main'),
  { loading: () => <DetailSkeleton /> }
);
```

#### Metrics 页面
```typescript
// 所有图表组件都使用动态导入
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false });
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false });
```

### System 页面

#### Admin 页面
```typescript
// 系统配置 - 管理功能，动态导入
const GatewayConfig = dynamic(
  () => import('./gateway-config-card'),
  { ssr: false }
);

const CacheMaintenance = dynamic(
  () => import('./cache-maintenance-card'),
  { ssr: false }
);
```

#### Roles 页面
```typescript
// 权限编辑对话框 - 条件渲染，动态导入
const PermissionDialog = dynamic(
  () => import('./permission-dialog'),
  { ssr: false }
);
```

## 分割策略矩阵

| 组件类型 | 大小阈值 | 分割策略 | SSR | Loading |
|---------|---------|---------|-----|---------|
| 页面组件 | - | 自动分割 | ✅ | - |
| 图表组件 | > 50KB | 动态导入 | ❌ | Skeleton |
| 对话框 | > 20KB | 动态导入 | ❌ | - |
| 表格组件 | > 30KB | 动态导入 | ✅ | Skeleton |
| 表单组件 | > 30KB | 动态导入 | ✅ | Skeleton |
| 工具组件 | < 10KB | 静态导入 | ✅ | - |



## 最佳实践

### 1. 何时使用动态导入

**✅ 应该使用：**
- 大型第三方库（recharts, monaco-editor）
- 非首屏内容（对话框、抽屉）
- 条件渲染的组件（管理面板、高级功能）
- 路由特定的功能

**❌ 不应该使用：**
- 小型组件（< 10KB）
- 首屏必需的内容
- 频繁使用的组件
- 简单的 UI 组件

### 2. Loading 状态

始终为动态导入的组件提供 loading 状态：

```typescript
const HeavyComponent = dynamic(
  () => import('./heavy-component'),
  {
    loading: () => (
      <div className="animate-pulse">
        <div className="h-32 bg-gray-200 rounded" />
      </div>
    ),
  }
);
```

### 3. 错误处理

考虑添加错误边界：

```typescript
import { ErrorBoundary } from '@/components/error/error-boundary';

<ErrorBoundary fallback={<ErrorMessage />}>
  <DynamicComponent />
</ErrorBoundary>
```

### 4. 预加载策略

对于用户可能访问的组件，使用预加载：

```typescript
import dynamic from 'next/dynamic';

const EditDialog = dynamic(() => import('./edit-dialog'));

// 在用户悬停按钮时预加载
<button
  onMouseEnter={() => {
    // 预加载组件
    import('./edit-dialog');
  }}
>
  编辑
</button>
```

## 性能指标

### 目标

- **首屏 JS**：< 200KB（gzipped）
- **总 JS**：< 1MB（gzipped）
- **Chunk 数量**：20-50 个
- **最大 Chunk**：< 500KB

### 监控

使用以下命令监控 bundle 大小：

```bash
# 构建并分析
ANALYZE=true npm run build:analyze

# 查看 chunk 大小
du -sh .next/static/chunks/* | sort -h

# 查看总大小
du -sh .next/static/
```

## 故障排查

### 问题：Chunk 过大

**原因：**
- 未使用动态导入
- 导入了整个库而不是特定模块
- 重复的依赖

**解决方案：**
```typescript
// ❌ 错误：导入整个库
import * as Icons from 'lucide-react';

// ✅ 正确：只导入需要的图标
import { User, Settings } from 'lucide-react';
```

### 问题：过多的小 Chunk

**原因：**
- 过度使用动态导入
- 分割粒度太细

**解决方案：**
- 合并相关的小组件
- 只对大型组件使用动态导入

### 问题：加载闪烁

**原因：**
- 缺少 loading 状态
- 动态导入首屏内容

**解决方案：**
- 添加合适的 loading skeleton
- 首屏内容使用静态导入

## 参考资源

- [Next.js Dynamic Import](https://nextjs.org/docs/app/building-your-application/optimizing/lazy-loading)
- [React.lazy](https://react.dev/reference/react/lazy)
- [Code Splitting Best Practices](https://web.dev/code-splitting-suspense/)

---

**文档版本**：1.0  
**最后更新**：2025-12-10
