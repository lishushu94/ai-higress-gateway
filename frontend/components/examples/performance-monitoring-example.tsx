'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorBoundary } from '@/components/error';
import { CardSkeleton, TableSkeleton } from '@/components/ui/loading-skeletons';
import { usePerformance, useMeasure, useMountTime } from '@/lib/hooks/use-performance';

/**
 * 性能监控示例组件
 * 展示如何使用 ErrorBoundary、Loading Skeletons 和性能监控工具
 */
export function PerformanceMonitoringExample() {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<string | null>(null);
  const [error, setError] = useState(false);

  // 监控组件挂载时间
  useMountTime('PerformanceMonitoringExample', (duration) => {
    console.log(`Example component mounted in ${duration}ms`);
  });

  // 监控组件渲染性能
  usePerformance('PerformanceMonitoringExample');

  // 测量异步操作
  const { start, end } = useMeasure('data-fetch');

  const fetchData = async () => {
    setIsLoading(true);
    setError(false);
    start();

    try {
      // 模拟数据获取
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setData('Data loaded successfully!');
      
      const duration = end();
      console.log(`Data fetched in ${duration}ms`);
    } catch (err) {
      setError(true);
      end();
    } finally {
      setIsLoading(false);
    }
  };

  const triggerError = () => {
    throw new Error('This is a test error!');
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>性能监控示例</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={fetchData} disabled={isLoading}>
              {isLoading ? '加载中...' : '获取数据'}
            </Button>
            <Button onClick={triggerError} variant="destructive">
              触发错误
            </Button>
          </div>

          {isLoading && (
            <div className="space-y-4">
              <CardSkeleton />
              <TableSkeleton rows={3} columns={3} />
            </div>
          )}

          {data && !isLoading && (
            <Card>
              <CardContent className="p-4">
                <p className="text-green-600">{data}</p>
              </CardContent>
            </Card>
          )}

          {error && (
            <Card>
              <CardContent className="p-4">
                <p className="text-red-600">加载失败，请重试</p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <ErrorBoundary>
        <Card>
          <CardHeader>
            <CardTitle>受保护的内容</CardTitle>
          </CardHeader>
          <CardContent>
            <p>这个区域被 ErrorBoundary 保护，即使出错也不会影响其他部分。</p>
          </CardContent>
        </Card>
      </ErrorBoundary>
    </div>
  );
}
