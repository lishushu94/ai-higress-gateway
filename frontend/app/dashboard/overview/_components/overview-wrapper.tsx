"use client";

import { OverviewClient } from "./overview-client";

/**
 * Overview 包装组件
 * 
 * 职责：
 * - 作为客户端组件边界
 * - 渲染 OverviewClient 组件
 * 
 * 注意：由于服务端已通过 SWR fallback 预取数据，
 * 现在可以启用 SSR，避免之前的 hydration 错误
 */
export function OverviewWrapper() {
  return <OverviewClient />;
}
