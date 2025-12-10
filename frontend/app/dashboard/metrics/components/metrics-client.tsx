"use client";

import dynamic from "next/dynamic";
import { MetricsCards } from "@/components/dashboard/metrics/metrics-cards";
import { ChartSkeleton } from "@/components/ui/loading-skeletons";

// 动态导入大型图表组件
const MetricsCharts = dynamic(
  () =>
    import("@/components/dashboard/metrics/metrics-charts").then(
      (mod) => mod.MetricsCharts
    ),
  {
    loading: () => (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    ),
    ssr: false,
  }
);

const ProviderPerformance = dynamic(
  () =>
    import("@/components/dashboard/metrics/provider-performance").then(
      (mod) => mod.ProviderPerformance
    ),
  {
    loading: () => <ChartSkeleton />,
    ssr: false,
  }
);

export function MetricsClient() {
  return (
    <>
      {/* Key Metrics - 不需要动态导入，因为它很轻量 */}
      <MetricsCards />

      {/* Charts - 动态导入 */}
      <MetricsCharts />

      {/* Provider Performance - 动态导入 */}
      <ProviderPerformance />
    </>
  );
}
