import { MetricsClient } from "./components/metrics-client";

export default function MetricsPage() {
  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-3xl font-bold mb-2">系统指标</h1>
        <p className="text-muted-foreground">实时性能监控</p>
      </div>

      <MetricsClient />
    </div>
  );
}
