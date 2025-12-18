"use client";

import { useState } from "react";
import { FilterBar, TimeRange, Transport, StreamFilter } from "./filter-bar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * FilterBar 组件演示
 * 用于测试筛选器组件的功能
 */
export function FilterBarDemo() {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [transport, setTransport] = useState<Transport>("all");
  const [isStream, setIsStream] = useState<StreamFilter>("all");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard v2 Filter Bar</CardTitle>
          <CardDescription>
            Test the filter bar component with time range, transport, and stream filters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FilterBar
            timeRange={timeRange}
            transport={transport}
            isStream={isStream}
            onTimeRangeChange={setTimeRange}
            onTransportChange={setTransport}
            onStreamChange={setIsStream}
          />

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="text-sm font-semibold mb-2">Current Filter State:</h3>
            <div className="space-y-1 text-sm">
              <div>
                <span className="font-medium">Time Range:</span> {timeRange}
              </div>
              <div>
                <span className="font-medium">Transport:</span> {transport}
              </div>
              <div>
                <span className="font-medium">Stream:</span> {isStream}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
