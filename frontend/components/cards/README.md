# Card 组件

## AdaptiveCard - 自适应主题卡片

唯一的通用卡片组件，通过 CSS 变量和类名自动适配所有主题。

### 特性

- ✅ **自动主题适配**：通过 CSS 变量自动切换颜色和效果
- ✅ **装饰可拔插**：圣诞装饰等效果通过 CSS 类控制
- ✅ **无需封装**：所有主题共用一个组件
- ✅ **易于扩展**：添加新主题只需修改 CSS

### 使用方式

```tsx
import { AdaptiveCard, CardHeader, CardTitle, CardContent } from "@/components/cards";

<AdaptiveCard>
  <CardHeader>
    <CardTitle>标题</CardTitle>
  </CardHeader>
  <CardContent>
    内容会根据主题自动适配样式
  </CardContent>
</AdaptiveCard>
```

### Props

- `showDecor`: 是否显示装饰（默认: `true`）
- 其他 props 继承自 shadcn Card 组件

### 主题配置

所有主题样式在 `app/globals.css` 中配置：

```css
/* 通用玻璃拟态 Card */
.theme-adaptive-card {
  backdrop-filter: blur(16px) saturate(150%);
  background: rgba(255, 255, 255, 0.12);
}

/* 暗色主题 */
.dark .theme-adaptive-card {
  background: rgba(0, 0, 0, 0.3);
}

/* 圣诞主题 */
.christmas .theme-adaptive-card {
  background: rgba(255, 255, 255, 0.15);
}
```

### 添加新主题

只需在 `globals.css` 中添加新主题的 CSS 规则：

```css
/* 新主题 */
.ocean .theme-adaptive-card {
  background: rgba(224, 242, 254, 0.15);
}

/* 新主题的装饰（可选） */
.ocean-card-decor {
  display: none;
}

.ocean .ocean-card-decor {
  display: block;
}
```

## 预设内容卡片

### StatCard - 统计数据卡片

```tsx
import { StatCard } from "@/components/cards";

<StatCard
  title="总用户数"
  value="1,234"
  change="+12.5%"
  trend="up"
/>
```

### MetricCard - 指标卡片

```tsx
import { MetricCard } from "@/components/cards";

<MetricCard
  title="API 调用量"
  value="45,678"
  chart={<LineChart data={data} />}
/>
```

### IntensityCard - 强度展示卡片

```tsx
import { IntensityCard } from "@/components/cards";

<IntensityCard
  title="服务器负载"
  intensity="high"
  value="87%"
/>
```

## 装饰系统

装饰通过 CSS 类控制显示/隐藏：

```css
.christmas-card-decor {
  display: none;
}

.christmas .christmas-card-decor {
  display: block;
}
```

## 优势

1. **代码简洁**：只有一个卡片组件
2. **易于维护**：主题配置集中在 CSS
3. **性能优秀**：无需 JS 判断主题
4. **扩展性强**：添加新主题不需要修改组件代码

## 最佳实践

### 响应式布局

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <AdaptiveCard>...</AdaptiveCard>
  <AdaptiveCard>...</AdaptiveCard>
  <AdaptiveCard>...</AdaptiveCard>
</div>
```

### 禁用装饰

```tsx
<AdaptiveCard showDecor={false}>
  <CardContent>无装饰的卡片</CardContent>
</AdaptiveCard>
```

### 组合使用

```tsx
<AdaptiveCard>
  <CardHeader>
    <CardTitle>标题</CardTitle>
    <CardAction>操作</CardAction>
  </CardHeader>
  <CardContent>内容</CardContent>
  <CardFooter>底部信息</CardFooter>
</AdaptiveCard>
```
