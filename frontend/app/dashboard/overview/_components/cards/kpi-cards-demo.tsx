"use client";

import { useState } from "react";
import {
  TotalRequestsCard,
  CreditsSpentCard,
  LatencyP95Card,
  ErrorRateCard,
  TotalTokensCard,
} from "./index";

/**
 * KPI 卡片演示组件
 * 
 * 用于测试和展示 5 张 KPI 卡片的不同状态：
 * - 正常数据显示
 * - 加载态
 * - 错误态
 */
export function KPICardsDemo() {
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // 模拟数据
  const mockData = {
    totalRequests: 125430,
    creditsSpent: 1234.56,
    latencyP95: 856,
    errorRate: 0.0234, // 2.34%
    inputTokens: 1234567,
    outputTokens: 987654,
    totalTokens: 2222221,
  };

  return (
    <div className="space-y-6">
      {/* 控制按钮 */}
      <div className="flex gap-2">
        <button
          onClick={() => setIsLoading(!isLoading)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
        >
          切换加载态
        </button>
        <button
          onClick={() => setHasError(!hasError)}
          className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md text-sm"
        >
          切换错误态
        </button>
      </div>

      {/* KPI 卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <TotalRequestsCard
          value={mockData.totalRequests}
          isLoading={isLoading}
          error={hasError ? new Error("Failed to load") : undefined}
        />
        <CreditsSpentCard
          value={mockData.creditsSpent}
          isLoading={isLoading}
          error={hasError ? new Error("Failed to load") : undefined}
        />
        <LatencyP95Card
          value={mockData.latencyP95}
          isLoading={isLoading}
          error={hasError ? new Error("Failed to load") : undefined}
        />
        <ErrorRateCard
          value={mockData.errorRate}
          isLoading={isLoading}
          error={hasError ? new Error("Failed to load") : undefined}
        />
        <TotalTokensCard
          inputTokens={mockData.inputTokens}
          outputTokens={mockData.outputTokens}
          totalTokens={mockData.totalTokens}
          isLoading={isLoading}
          error={hasError ? new Error("Failed to load") : undefined}
        />
      </div>
    </div>
  );
}
