# 代码质量检查工具 - 快速参考

## 🚀 快速开始

### 安装 pre-commit hooks

```bash
# 在项目根目录
pre-commit install
```

### 运行检查

```bash
# 在 frontend 目录
cd frontend

# ESLint 检查
bun run lint

# 自动修复 ESLint 问题
bun run lint:fix

# TypeScript 类型检查
bun run type-check

# 完整代码质量检查
bun run quality-check

# 服务端组件分析（生成优化报告）
bun run analyze:server-components
```

## 📋 自定义 ESLint 规则

### 1. 客户端组件检查

❌ **错误**：page.tsx 中使用 "use client"
```typescript
// app/dashboard/page.tsx
"use client";
export default function Page() { }
```

✅ **正确**：拆分到客户端组件
```typescript
// app/dashboard/page.tsx
import { DashboardClient } from './components/dashboard-client';
export default function Page() {
  return <DashboardClient />;
}

// app/dashboard/components/dashboard-client.tsx
"use client";
export function DashboardClient() { }
```

### 2. 文件大小检查

⚠️ **警告**：组件超过 200 行

**解决方案**：
- 拆分为更小的子组件
- 提取状态逻辑到自定义 Hook
- 使用组合模式

### 3. 命名规范检查

❌ **错误**：
- `UserProfileCard.tsx`
- `user_profile_card.tsx`
- `userProfileCard.tsx`

✅ **正确**：
- `user-profile-card.tsx`
- `api-key-table.tsx`
- `provider-detail-main.tsx`

## 🔧 TypeScript 严格模式

启用的检查项：
- ✅ `strict: true` - 所有严格检查
- ✅ `noImplicitAny: true` - 禁止隐式 any
- ✅ `strictNullChecks: true` - 严格 null 检查
- ✅ `noUnusedLocals: true` - 检测未使用的变量
- ✅ `noUnusedParameters: true` - 检测未使用的参数
- ✅ `noImplicitReturns: true` - 确保所有路径有返回值
- ✅ `noUncheckedIndexedAccess: true` - 索引访问添加 undefined 检查

## 🎯 最佳实践

### 服务端组件优先
```typescript
// ✅ 默认使用服务端组件
export default function Page() {
  return <div>Server Component</div>;
}

// ✅ 需要交互时拆分客户端组件
"use client";
export function InteractiveComponent() {
  const [state, setState] = useState();
  return <button onClick={() => setState()}>Click</button>;
}
```

### 组件拆分
```typescript
// ❌ 避免：大型单体组件
export function LargeComponent() {
  // 300+ 行代码
}

// ✅ 推荐：拆分为小组件
export function ParentComponent() {
  return (
    <>
      <HeaderSection />
      <ContentSection />
      <FooterSection />
    </>
  );
}
```

### 类型安全
```typescript
// ❌ 避免
const data: any = fetchData();

// ✅ 推荐
interface UserData {
  id: string;
  name: string;
}
const data: UserData = fetchData();
```

## 🔍 Pre-commit Hooks

### 自动运行（每次 commit）
- ✅ ESLint 检查
- ✅ TypeScript 类型检查

### 手动运行
```bash
# 运行所有 hooks
pre-commit run --all-files

# 运行完整代码质量检查
pre-commit run frontend-quality-check --all-files
```

## 🔬 服务端组件分析

### 生成优化报告

```bash
bun run analyze:server-components
```

这个脚本会：
- 🔍 扫描所有 page.tsx 文件
- 📊 检测不必要的 "use client" 声明
- 📝 生成详细的优化建议报告
- 🎯 按优先级分类优化任务

### 报告内容

报告会保存在 `server-components-analysis-report.md`，包含：
- 统计摘要（总页面数、使用客户端组件的比例等）
- 🔴 高优先级：可直接移除 "use client"
- 🟡 中优先级：需要拆分客户端组件
- 🟢 低优先级：需要检查的页面
- ✅ 正确的服务端组件列表

### 使用场景

- 📋 定期检查项目中的组件架构
- 🎯 识别优化机会
- 📈 跟踪优化进度
- 📚 作为重构指南

详细说明：`scripts/README-analyze-server-components.md`

## 📚 详细文档

查看完整文档：`docs/code-quality-tools.md`

## 🆘 常见问题

### Q: 如何临时禁用某个规则？
```typescript
/* eslint-disable frontend-optimization/check-file-size */
// 代码
/* eslint-enable frontend-optimization/check-file-size */
```

### Q: 如何跳过 pre-commit 检查？
```bash
git commit --no-verify  # 不推荐
```

### Q: TypeScript 报错怎么办？
优先修复类型定义，避免使用 `@ts-ignore`

## 🎉 配置完成

所有工具已配置完成！开始编写高质量代码吧！
