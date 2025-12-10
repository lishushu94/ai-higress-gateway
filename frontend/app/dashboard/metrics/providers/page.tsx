import { ProvidersMetricsClient } from "./components/providers-metrics-client";

export default function ProvidersMetricsPage() {
  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-3xl font-bold mb-2">Provider 指标</h1>
        <p className="text-muted-foreground">
          按 Provider 聚合的性能指标。
        </p>
      </div>

      <ProvidersMetricsClient />
    </div>
  );
}
