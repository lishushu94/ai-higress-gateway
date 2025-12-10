# Loading Skeletons 使用指南

本文档介绍如何使用各种 Loading Skeleton 组件来提升用户体验。

## 组件列表

### CardSkeleton

用于加载卡片内容时的占位显示。

```tsx
import { CardSkeleton } from '@/components/ui/loading-skeletons';

function MyComponent() {
  const { data, isLoading } = useSWR('/api/data');

  if (isLoading) {
    return <CardSkeleton />;
  }

  return <Card>{/* 实际内容 */}</Card>;
}
```

### TableSkeleton

用于加载表格数据时的占位显示。

```tsx
import { TableSkeleton } from '@/components/ui/loading-skeletons';

function DataTable() {
  const { data, isLoading } = useSWR('/api/table-data');

  if (isLoading) {
    return <TableSkeleton rows={10} columns={5} />;
  }

  return <Table>{/* 实际表格 */}</Table>;
}
```

**Props:**
- `rows` (可选): 显示的行数，默认为 5
- `columns` (可选): 显示的列数，默认为 4

### StatCardSkeleton

用于加载统计数据卡片时的占位显示。

```tsx
import { StatCardSkeleton } from '@/components/ui/loading-skeletons';

function StatsGrid() {
  const { data, isLoading } = useSWR('/api/stats');

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  return <div>{/* 实际统计卡片 */}</div>;
}
```

### ListSkeleton

用于加载列表项时的占位显示。

```tsx
import { ListSkeleton } from '@/components/ui/loading-skeletons';

function ItemList() {
  const { data, isLoading } = useSWR('/api/items');

  if (isLoading) {
    return <ListSkeleton count={5} />;
  }

  return <div>{/* 实际列表 */}</div>;
}
```

**Props:**
- `count` (可选): 显示的列表项数量，默认为 3

### FormSkeleton

用于加载表单时的占位显示。

```tsx
import { FormSkeleton } from '@/components/ui/loading-skeletons';

function EditForm() {
  const { data, isLoading } = useSWR('/api/form-data');

  if (isLoading) {
    return <FormSkeleton fields={6} />;
  }

  return <form>{/* 实际表单 */}</form>;
}
```

**Props:**
- `fields` (可选): 显示的表单字段数量，默认为 4

### ChartSkeleton

用于加载图表时的占位显示。

```tsx
import { ChartSkeleton } from '@/components/ui/loading-skeletons';

function MetricsChart() {
  const { data, isLoading } = useSWR('/api/metrics');

  if (isLoading) {
    return <ChartSkeleton />;
  }

  return <Chart data={data} />;
}
```

### PageSkeleton

用于加载整个页面时的占位显示。

```tsx
import { PageSkeleton } from '@/components/ui/loading-skeletons';

function DashboardPage() {
  const { data, isLoading } = useSWR('/api/dashboard');

  if (isLoading) {
    return <PageSkeleton />;
  }

  return <div>{/* 实际页面内容 */}</div>;
}
```

### DialogSkeleton

用于加载对话框内容时的占位显示。

```tsx
import { DialogSkeleton } from '@/components/ui/loading-skeletons';
import { Dialog, DialogContent } from '@/components/ui/dialog';

function EditDialog({ open, itemId }) {
  const { data, isLoading } = useSWR(itemId ? `/api/items/${itemId}` : null);

  return (
    <Dialog open={open}>
      <DialogContent>
        {isLoading ? <DialogSkeleton /> : <EditForm data={data} />}
      </DialogContent>
    </Dialog>
  );
}
```

## 使用模式

### 1. 条件渲染

最常见的使用方式是在数据加载时显示骨架屏：

```tsx
function MyComponent() {
  const { data, isLoading } = useSWR('/api/data');

  if (isLoading) {
    return <CardSkeleton />;
  }

  return <Card>{data}</Card>;
}
```

### 2. 与 Suspense 配合使用

在服务端组件中可以配合 Suspense 使用：

```tsx
import { Suspense } from 'react';
import { CardSkeleton } from '@/components/ui/loading-skeletons';

export default function Page() {
  return (
    <Suspense fallback={<CardSkeleton />}>
      <DataComponent />
    </Suspense>
  );
}
```

### 3. 动态导入的加载状态

使用 next/dynamic 时指定加载组件：

```tsx
import dynamic from 'next/dynamic';
import { ChartSkeleton } from '@/components/ui/loading-skeletons';

const HeavyChart = dynamic(
  () => import('@/components/charts/heavy-chart'),
  {
    loading: () => <ChartSkeleton />,
    ssr: false
  }
);
```

### 4. 多个骨架屏组合

对于复杂页面，可以组合多个骨架屏：

```tsx
function DashboardPage() {
  const { data, isLoading } = useSWR('/api/dashboard');

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid gap-4 md:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <TableSkeleton rows={8} columns={6} />
      </div>
    );
  }

  return <div>{/* 实际内容 */}</div>;
}
```

## 最佳实践

1. **匹配实际布局**：骨架屏应该尽可能匹配实际内容的布局和大小
2. **合理的数量**：不要显示过多的骨架屏项目，3-5 个通常就足够了
3. **快速切换**：确保从骨架屏到实际内容的切换是平滑的
4. **避免闪烁**：对于快速加载的内容，可以添加最小显示时间避免闪烁
5. **一致性**：在整个应用中使用一致的骨架屏样式

## 自定义骨架屏

如果预设的骨架屏不满足需求，可以使用基础的 Skeleton 组件自定义：

```tsx
import { Skeleton } from '@/components/ui/skeleton';

function CustomSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}
```

## 性能考虑

1. 骨架屏组件应该是轻量级的，避免复杂的逻辑
2. 使用 CSS 动画而不是 JavaScript 动画
3. 避免在骨架屏中使用大量的 DOM 节点
4. 考虑使用 `will-change` CSS 属性优化动画性能
