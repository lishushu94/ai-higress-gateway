"use client";

import { LatencyPercentilesChart } from "./latency-percentiles-chart";
import type { DashboardV2PulseDataPoint } from "@/lib/api-types";

/**
 * 生成模拟的延迟分位数数据（近 24 小时，每小时一个点）
 */
function generateMockLatencyData(): DashboardV2PulseDataPoint[] {
  const data: DashboardV2PulseDataPoint[] = [];
  const now = new Date();
  
  // 生成过去 24 小时的数据，每小时一个点
  for (let i = 23; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    
    // 模拟延迟数据，有一些波动
    const baseLatency = 200 + Math.random() * 100;
    const spike = i === 10 || i === 15 ? 300 : 0; // 在某些时间点模拟延迟峰值
    
    data.push({
      window_start: time.toISOString(),
      total_requests: Math.floor(100 + Math.random() * 200),
      error_4xx_requests: Math.floor(Math.random() * 10),
      error_5xx_requests: Math.floor(Math.random() * 5),
      error_429_requests: Math.floor(Math.random() * 3),
      error_timeout_requests: Math.floor(Math.random() * 2),
      latency_p50_ms: Math.floor(baseLatency + spike),
      latency_p95_ms: Math.floor(baseLatency * 1.5 + spike),
      latency_p99_ms: Math.floor(baseLatency * 2 + spike),
    });
  }
  
  return data;
}

/**
 * 延迟分位数图表演示页面
 */
export default function LatencyPercentilesChartDemo() {
  const mockData = generateMockLatencyData();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">延迟分位数趋势图表演示</h1>
        <p className="text-muted-foreground">
          展示 P50、P95、P99 三条延迟曲线，单位为毫秒 (ms)
        </p>
      </div>

      {/* 正常状态 */}
      <div>
        <h2 className="text-lg font-semibold mb-3">正常状态（有数据）</h2>
        <LatencyPercentilesChart
          data={mockData}
          isLoading={false}
        />
      </div>

      {/* 加载状态 */}
      <div>
        <h2 className="text-lg font-semibold mb-3">加载状态</h2>
        <LatencyPercentilesChart
          data={[]}
          isLoading={true}
        />
      </div>

      {/* 错误状态 */}
      <div>
        <h2 className="text-lg font-semibold mb-3">错误状态</h2>
        <LatencyPercentilesChart
          data={[]}
          isLoading={false}
          error={new Error("Failed to fetch latency data")}
        />
      </div>

      {/* 空数据状态 */}
      <div>
        <h2 className="text-lg font-semibold mb-3">空数据状态</h2>
        <LatencyPercentilesChart
          data={[]}
          isLoading={false}
        />
      </div>

      {/* 数据说明 */}
      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">图表说明</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>P50（中位数）：50% 的请求延迟低于此值</li>
          <li>P95：95% 的请求延迟低于此值</li>
          <li>P99：99% 的请求延迟低于此值</li>
          <li>Y 轴显示延迟单位 (ms)</li>
          <li>X 轴显示时间（HH:mm 格式）</li>
          <li>三条折线使用不同颜色区分（浅色 → 中色 → 深色）</li>
        </ul>
      </div>
    </div>
  );
}
