# AI Higress PWA 桌面安装功能实现计划

## 概述

本文档详细说明如何为 AI Higress 前端实现 Progressive Web App (PWA) 功能，使其能够像 LobeChat 一样支持"安装到桌面"的功能。

## 当前项目状态分析

基于对项目的分析，AI Higress 前端使用 Next.js 16 + TypeScript + Tailwind CSS 构建，具备实现 PWA 的基础条件。

## PWA 核心技术组件

### 1. Web App Manifest
**文件位置**: `frontend/public/manifest.json`

```json
{
  "name": "AI Higress",
  "short_name": "AI Higress",
  "description": "AI智能路由网关管理系统",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0066cc",
  "orientation": "portrait-primary",
  "scope": "/",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["productivity", "business"],
  "lang": "zh-CN",
  "dir": "ltr"
}
```

### 2. Service Worker
**文件位置**: `frontend/public/sw.js`

Service Worker 用于实现离线缓存、后台同步等功能。

### 3. PWA 依赖包
需要在 `frontend/package.json` 中添加：

```json
{
  "dependencies": {
    "next-pwa": "^5.6.0",
    "workbox-webpack-plugin": "^7.0.0"
  }
}
```

### 4. Next.js 配置更新
**文件**: `frontend/next.config.ts`

```typescript
import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  // 现有配置...
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
})(nextConfig);
```

## 实施步骤

### Phase 1: 基础 PWA 配置
1. 创建 Web App Manifest
2. 生成应用图标 (192x192, 512x512)
3. 配置 Next.js PWA 插件
4. 实现基础 Service Worker

### Phase 2: 离线功能增强
1. 配置离线缓存策略
2. 添加离线页面
3. 实现关键资源预缓存
4. 添加安装提示组件

### Phase 3: 高级功能
1. 实现推送通知 (可选)
2. 添加后台同步
3. 优化性能和加载时间

## Service Worker 实现

```javascript
// frontend/public/sw.js
const CACHE_NAME = 'ai-higress-v1';
const urlsToCache = [
  '/',
  '/dashboard',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// 安装事件
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// 激活事件
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 网络请求拦截
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
```

## 安装提示组件

创建 React 组件来引导用户安装 PWA：

```typescript
// frontend/components/pwa/install-prompt.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-white border rounded-lg shadow-lg p-4">
      <p className="text-sm text-gray-600 mb-2">安装 AI Higress 到桌面以获得更好的体验</p>
      <div className="flex gap-2">
        <Button onClick={handleInstall} size="sm">
          安装
        </Button>
        <Button
          onClick={() => setShowPrompt(false)}
          variant="outline"
          size="sm"
        >
          稍后
        </Button>
      </div>
    </div>
  );
}
```

## 应用图标设计要求

遵循墨水风格设计原则：
- 主色调: 深灰色 (#1a1a1a) 和纯白 (#ffffff)
- 强调色: 深蓝 (#0066cc)
- 设计元素: 简洁的路由/网关图标，避免复杂图形
- 格式: PNG, 支持透明背景

## 测试清单

### 功能测试
- [ ] 在 Chrome/Edge 中显示"安装"按钮
- [ ] 安装后以独立窗口运行
- [ ] 离线时显示缓存内容
- [ ] 网络恢复后自动同步

### 兼容性测试
- [ ] Chrome Desktop (Windows/Mac/Linux)
- [ ] Edge Desktop
- [ ] Safari Desktop (有限支持)
- [ ] Chrome Mobile (Android)
- [ ] Safari Mobile (iOS)

### Lighthouse PWA 测试
- [ ] PWA 评分达到 90+
- [ ] 所有 PWA 指标通过

## 部署注意事项

1. **HTTPS 要求**: PWA 必须在 HTTPS 环境下运行
2. **缓存策略**: 合理配置 Service Worker 缓存，避免过度缓存
3. **版本控制**: Service Worker 更新机制，确保用户获取最新版本
4. **监控**: 添加 PWA 安装率和使用情况监控

## 后续优化

1. **性能优化**: 优化首次加载时间和运行时性能
2. **推送通知**: 实现基于 Web Push 的通知功能
3. **数据同步**: 添加后台数据同步机制
4. **多语言支持**: 为不同地区用户提供本地化安装体验

## 参考资源

- [PWA 官方文档](https://web.dev/progressive-web-apps/)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Next.js PWA 插件](https://github.com/shadowwalker/next-pwa)