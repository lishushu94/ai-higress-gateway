# Dashboard v2 图表组件

本目录包含 Dashboard v2 用户页的所有图表组件。

## 组件列表

### RequestsErrorsChart

请求 & 错误趋势图表，展示近 24 小时的请求和错误数据（展示组件）。

### RequestsErrorsChartLive

请求 & 错误趋势图表的实时版本，自动连接 API 获取数据（容器组件）。

**功能特性：**
- 使用 Recharts ComposedChart 组合折线图和堆叠柱状图
- 折线图展示总请求数趋势
- 堆叠柱状图展示 4xx/5xx/429/timeout 错误分布
- 自动补零处理缺失的分钟数据
- 支持加载态、错误态和空态显示
- 完全国际化支持

**Props：**
```typescript
interface RequestsErrorsChartProps {
  data: DashboardV2PulseDataPoint[];  // Pulse 数据点数组
  isLoading: boolean;                  // 加载状态
  error?: Error;                       // 错误对象
}
```

**使用示例（展示组件）：**
```tsx
import { RequestsErrorsChart } from "@/app/dashboard/overview/_components/charts";
import { useUserDashboardPulse } from "@/lib/swr/use-dashboard-v2";

function MyComponent() {
  const { points, loading, error } = useUserDashboardPulse({
    transport: "all",
    isStream: "all",
  });

  return (
    <RequestsErrorsChart
      data={points}
      isLoading={loading}
      error={error}
    />
  );
}
```

**使用示例（实时组件，推荐）：**
```tsx
import { RequestsErrorsChartLive } from "@/app/dashboard/overview/_components/charts";

function MyComponent() {
  return (
    <RequestsErrorsChartLive
      transport="all"
      isStream="all"
    />
  );
}
```

**数据补零逻辑：**

组件会自动检测数据中缺失的分钟，并补零以确保图表连续显示。例如：
- 输入数据：`[{time: "10:00", ...}, {time: "10:02", ...}]`
- 补零后：`[{time: "10:00", ...}, {time: "10:01", requests: 0, ...}, {time: "10:02", ...}]`

**颜色配置：**

图表使用 CSS 变量配置颜色，自动适配亮色/暗色主题：
- 总请求数（折线）：`hsl(var(--chart-1))` - 主色
- 4xx 错误（柱状）：`hsl(var(--chart-4))` - 橙色系
- 5xx 错误（柱状）：`hsl(var(--destructive))` - 红色系
- 429 错误（柱状）：`hsl(var(--warning))` - 黄色系
- Timeout 错误（柱状）：`hsl(var(--chart-5))` - 灰色系

## 开发指南

### 添加新图表

1. 在本目录创建新的 `.tsx` 文件
2. 使用 `ChartContainer` 包裹 Recharts 组件
3. 配置 `chartConfig` 对象定义颜色和标签
4. 使用 `useI18n()` 获取国际化文案
5. 处理加载态、错误态和空态
6. 在 README 中添加文档

### 测试图表

使用 `*-demo.tsx` 文件进行独立测试：
```bash
# 在浏览器中访问
http://localhost:3000/dashboard/overview/demo
```

### 性能优化

- 使用 `useMemo` 缓存图表数据转换
- 避免在渲染时创建新对象
- 合理设置动画时长（建议 800ms）
- 大数据集时考虑采样或分页

## 相关文档

- [设计文档](/.kiro/specs/dashboard-overview-refactor/design.md)
- [需求文档](/.kiro/specs/dashboard-overview-refactor/requirements.md)
- [Recharts 文档](https://recharts.org/)
