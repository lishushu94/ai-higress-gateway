import { KPICardsDemo } from "./_components/kpi-cards-demo";

/**
 * Dashboard v2 用户页 - 概览页面
 * 
 * 这是一个临时的演示页面，用于测试 KPI 卡片组件。
 * 后续会被完整的 Dashboard v2 页面替换。
 */
export default function DashboardOverviewPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard v2 - KPI Cards Demo</h1>
        <p className="text-muted-foreground mt-2">
          测试 5 张 KPI 卡片组件的不同状态
        </p>
      </div>

      <KPICardsDemo />
    </div>
  );
}
