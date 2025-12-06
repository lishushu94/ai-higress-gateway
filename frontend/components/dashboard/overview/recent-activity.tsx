"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n-context";
import { useOverviewActivity } from "@/lib/swr/use-overview-metrics";

function formatTimeLabel(iso: string): string {
  const d = new Date(iso);
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function RecentActivity() {
  const { t } = useI18n();
  const { activity, loading } = useOverviewActivity({
    time_range: "today",
  });

  const rows = useMemo(() => {
    if (!activity) {
      return [];
    }
    const points = activity.points || [];
    if (!points.length) {
      return [];
    }

    const recent = points.slice(-12); // 取最近 12 个时间桶
    const maxTotal = Math.max(...recent.map((p) => p.total_requests || 0), 1);

    return recent.map((p) => {
      const total = p.total_requests;
      const error = p.error_requests;
      const successRate = total > 0 ? 1 - p.error_rate : 0;
      const width = (total / maxTotal) * 100;
      return {
        time: formatTimeLabel(p.window_start),
        total,
        error,
        successRate,
        width,
      };
    });
  }, [activity]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("overview.recent_activity")}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && rows.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            {t("overview.recent_activity_placeholder")}
          </div>
        ) : rows.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            {t("overview.recent_activity_placeholder")}
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="w-14 text-xs text-muted-foreground">
                  {row.time}
                </span>
                <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
                  <div
                    className="h-2 rounded bg-primary/70"
                    style={{ width: `${row.width}%` }}
                  />
                </div>
                <div className="w-32 text-xs text-right text-muted-foreground">
                  <span className="mr-2">Req {row.total}</span>
                  <span>Err {row.error}</span>
                </div>
                <div className="w-16 text-xs text-right">
                  {(row.successRate * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
