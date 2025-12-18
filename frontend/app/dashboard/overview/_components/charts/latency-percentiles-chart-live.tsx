"use client";

import { LatencyPercentilesChart } from "./latency-percentiles-chart";
import { useUserDashboardPulse } from "@/lib/swr/use-dashboard-v2";

interface LatencyPercentilesChartLiveProps {
  transport?: "all" | "http" | "sdk" | "claude_cli";
  isStream?: "all" | "true" | "false";
}

/**
 * 延迟分位数图表（实时数据版本）
 * 
 * 从 SWR Hook 获取实时数据并渲染图表
 */
export function LatencyPercentilesChartLive({
  transport = "all",
  isStream = "all",
}: LatencyPercentilesChartLiveProps) {
  const { data, isLoading, error } = useUserDashboardPulse({
    transport,
    is_stream: isStream,
  });

  return (
    <LatencyPercentilesChart
      data={data?.data || []}
      isLoading={isLoading}
      error={error}
    />
  );
}
