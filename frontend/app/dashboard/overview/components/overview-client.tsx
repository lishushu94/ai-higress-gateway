"use client";

import { StatsGrid } from "@/components/dashboard/overview/stats-grid";
import { ActiveProviders } from "@/components/dashboard/overview/active-providers";
import { RecentActivity } from "@/components/dashboard/overview/recent-activity";
import { GatewayConfigCard } from "@/components/dashboard/overview/gateway-config-card";

/**
 * 客户端包装器组件
 * 负责管理客户端状态、事件处理和数据获取
 */
export function OverviewClient() {
  return (
    <>
      {/* Stats Grid */}
      <StatsGrid />

      {/* Gateway configuration (visible to all logged-in users) */}
      <GatewayConfigCard />

      {/* Active Providers */}
      <ActiveProviders />

      {/* Recent Activity */}
      <RecentActivity />
    </>
  );
}
