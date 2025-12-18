"use client";

import { RequestsErrorsChart } from "./requests-errors-chart";
import type { DashboardV2PulseDataPoint } from "@/lib/api-types";

/**
 * 生成模拟的 Pulse 数据（近 24 小时，分钟粒度）
 */
function generateMockPulseData(): DashboardV2PulseDataPoint[] {
  const data: DashboardV2PulseDataPoint[] = [];
  const now = new Date();
  
  // 生成过去 24 小时的数据，每 5 分钟一个数据点（共 288 个点）
  for (let i = 288; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 5 * 60 * 1000);
    
    // 模拟数据：白天请求多，夜间请求少
    const hour = time.getHours();
    const isBusinessHours = hour >= 9 && hour <= 18;
    const baseRequests = isBusinessHours ? 100 : 30;
    
    // 添加一些随机波动
    const randomFactor = 0.5 + Math.random();
    const totalRequests = Math.floor(baseRequests * randomFactor);
    
    // 错误率约 2-5%
    const errorRate = 0.02 + Math.random() * 0.03;
    const totalErrors = Math.floor(totalRequests * errorRate);
    
    // 分配错误类型
    const error4xx = Math.floor(totalErrors * 0.5);
    const error5xx = Math.floor(totalErrors * 0.3);
    const error429 = Math.floor(totalErrors * 0.15);
    const errorTimeout = totalErrors - error4xx - error5xx - error429;
    
    // 延迟数据
    const baseLatency = isBusinessHours ? 200 : 150;
    const latencyVariation = Math.random() * 100;
    
    data.push({
      window_start: time.toISOString(),
      total_requests: totalRequests,
      error_4xx_requests: error4xx,
      error_5xx_requests: error5xx,
      error_429_requests: error429,
      error_timeout_requests: errorTimeout,
      latency_p50_ms: baseLatency + latencyVariation,
      latency_p95_ms: baseLatency + latencyVariation + 100,
      latency_p99_ms: baseLatency + latencyVariation + 200,
    });
  }
  
  return data;
}

/**
 * 生成有缺失数据的 Pulse 数据（用于测试补零功能）
 */
function generateSparseData(): DashboardV2PulseDataPoint[] {
  const fullData = generateMockPulseData();
  
  // 随机删除 30% 的数据点
  return fullData.filter(() => Math.random() > 0.3);
}

export function RequestsErrorsChartDemo() {
  const mockData = generateMockPulseData();
  const sparseData = generateSparseData();

  return (
    <div className="space-y-8 p-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">请求 & 错误趋势图表 Demo</h2>
        <p className="text-muted-foreground mb-6">
          展示近 24 小时的请求和错误趋势，使用 ComposedChart 组合折线图和堆叠柱状图。
        </p>
      </div>

      {/* 正常数据 */}
      <div>
        <h3 className="text-lg font-semibold mb-2">1. 正常数据（完整 24 小时）</h3>
        <RequestsErrorsChart data={mockData} isLoading={false} />
      </div>

      {/* 稀疏数据（测试补零） */}
      <div>
        <h3 className="text-lg font-semibold mb-2">2. 稀疏数据（测试补零功能）</h3>
        <p className="text-sm text-muted-foreground mb-2">
          数据中有 30% 的分钟缺失，组件会自动补零以保持连续性。
        </p>
        <RequestsErrorsChart data={sparseData} isLoading={false} />
      </div>

      {/* 加载状态 */}
      <div>
        <h3 className="text-lg font-semibold mb-2">3. 加载状态</h3>
        <RequestsErrorsChart data={[]} isLoading={true} />
      </div>

      {/* 错误状态 */}
      <div>
        <h3 className="text-lg font-semibold mb-2">4. 错误状态</h3>
        <RequestsErrorsChart
          data={[]}
          isLoading={false}
          error={new Error("Failed to fetch pulse data")}
        />
      </div>

      {/* 空数据 */}
      <div>
        <h3 className="text-lg font-semibold mb-2">5. 空数据</h3>
        <RequestsErrorsChart data={[]} isLoading={false} />
      </div>

      {/* 高错误率场景 */}
      <div>
        <h3 className="text-lg font-semibold mb-2">6. 高错误率场景</h3>
        <p className="text-sm text-muted-foreground mb-2">
          模拟系统异常时的高错误率情况。
        </p>
        <RequestsErrorsChart
          data={mockData.map((point) => ({
            ...point,
            error_5xx_requests: Math.floor(point.total_requests * 0.15),
            error_4xx_requests: Math.floor(point.total_requests * 0.1),
            error_429_requests: Math.floor(point.total_requests * 0.05),
            error_timeout_requests: Math.floor(point.total_requests * 0.05),
          }))}
          isLoading={false}
        />
      </div>
    </div>
  );
}
