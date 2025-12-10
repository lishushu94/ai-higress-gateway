'use client';

import { useEffect } from 'react';
import { initPerformanceMonitoring } from '@/lib/utils/performance';

/**
 * 性能监控组件
 * 在应用启动时初始化 Web Vitals 监控
 */
export function PerformanceMonitor() {
  useEffect(() => {
    // 初始化性能监控
    initPerformanceMonitoring();
  }, []);

  // 不渲染任何 UI
  return null;
}
