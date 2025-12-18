"use client";

import { HealthBadge } from "./health-badge";

/**
 * 健康状态徽章演示组件
 * 
 * 展示不同健康状态的徽章样式
 */
export function HealthBadgeDemo() {
  return (
    <div className="space-y-8 p-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">健康状态徽章演示</h2>
        <p className="text-muted-foreground mb-6">
          根据错误率和 P95 延迟显示系统健康状态
        </p>
      </div>

      {/* 正常状态 */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">正常状态（绿色）</h3>
        <p className="text-sm text-muted-foreground mb-2">
          错误率 &lt; 1% 且 P95 延迟 &lt; 1000ms
        </p>
        <div className="flex gap-4 flex-wrap">
          <div className="space-y-1">
            <HealthBadge errorRate={0.5} latencyP95Ms={800} />
            <p className="text-xs text-muted-foreground">
              错误率: 0.5%, 延迟: 800ms
            </p>
          </div>
          <div className="space-y-1">
            <HealthBadge errorRate={0.1} latencyP95Ms={500} />
            <p className="text-xs text-muted-foreground">
              错误率: 0.1%, 延迟: 500ms
            </p>
          </div>
          <div className="space-y-1">
            <HealthBadge errorRate={0} latencyP95Ms={300} />
            <p className="text-xs text-muted-foreground">
              错误率: 0%, 延迟: 300ms
            </p>
          </div>
        </div>
      </div>

      {/* 抖动状态 */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">抖动状态（黄色）</h3>
        <p className="text-sm text-muted-foreground mb-2">
          错误率在 1-5% 或 P95 延迟在 1000-3000ms
        </p>
        <div className="flex gap-4 flex-wrap">
          <div className="space-y-1">
            <HealthBadge errorRate={2} latencyP95Ms={800} />
            <p className="text-xs text-muted-foreground">
              错误率: 2%, 延迟: 800ms
            </p>
          </div>
          <div className="space-y-1">
            <HealthBadge errorRate={0.5} latencyP95Ms={1500} />
            <p className="text-xs text-muted-foreground">
              错误率: 0.5%, 延迟: 1500ms
            </p>
          </div>
          <div className="space-y-1">
            <HealthBadge errorRate={4} latencyP95Ms={2000} />
            <p className="text-xs text-muted-foreground">
              错误率: 4%, 延迟: 2000ms
            </p>
          </div>
        </div>
      </div>

      {/* 异常状态 */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">异常状态（红色）</h3>
        <p className="text-sm text-muted-foreground mb-2">
          错误率 &gt; 5% 或 P95 延迟 &gt; 3000ms
        </p>
        <div className="flex gap-4 flex-wrap">
          <div className="space-y-1">
            <HealthBadge errorRate={8} latencyP95Ms={1000} />
            <p className="text-xs text-muted-foreground">
              错误率: 8%, 延迟: 1000ms
            </p>
          </div>
          <div className="space-y-1">
            <HealthBadge errorRate={2} latencyP95Ms={4000} />
            <p className="text-xs text-muted-foreground">
              错误率: 2%, 延迟: 4000ms
            </p>
          </div>
          <div className="space-y-1">
            <HealthBadge errorRate={10} latencyP95Ms={5000} />
            <p className="text-xs text-muted-foreground">
              错误率: 10%, 延迟: 5000ms
            </p>
          </div>
        </div>
      </div>

      {/* 加载状态 */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">加载状态</h3>
        <p className="text-sm text-muted-foreground mb-2">
          数据加载中时显示占位符
        </p>
        <div className="flex gap-4 flex-wrap">
          <HealthBadge errorRate={0} latencyP95Ms={0} isLoading={true} />
        </div>
      </div>

      {/* 边界情况 */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">边界情况</h3>
        <p className="text-sm text-muted-foreground mb-2">
          测试边界值的状态判断
        </p>
        <div className="flex gap-4 flex-wrap">
          <div className="space-y-1">
            <HealthBadge errorRate={1} latencyP95Ms={999} />
            <p className="text-xs text-muted-foreground">
              错误率: 1% (边界), 延迟: 999ms
            </p>
          </div>
          <div className="space-y-1">
            <HealthBadge errorRate={0.99} latencyP95Ms={1000} />
            <p className="text-xs text-muted-foreground">
              错误率: 0.99%, 延迟: 1000ms (边界)
            </p>
          </div>
          <div className="space-y-1">
            <HealthBadge errorRate={5} latencyP95Ms={3000} />
            <p className="text-xs text-muted-foreground">
              错误率: 5% (边界), 延迟: 3000ms (边界)
            </p>
          </div>
          <div className="space-y-1">
            <HealthBadge errorRate={5.01} latencyP95Ms={3001} />
            <p className="text-xs text-muted-foreground">
              错误率: 5.01%, 延迟: 3001ms
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
