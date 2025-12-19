# 评测 UI 组件文档

本文档描述聊天助手系统中的评测相关 UI 组件。

## 组件概览

### 1. EvalChallengerCard

显示单个 challenger 的状态和输出。

**Props:**
- `challenger: ChallengerRun` - Challenger run 数据
- `isWinner?: boolean` - 是否为赢家（用于评分后显示）

**功能:**
- 显示模型名称和状态（queued、running、succeeded、failed）
- 显示输出预览和延迟信息
- 显示错误信息（如果失败）
- 为赢家显示特殊徽章

**使用示例:**
```tsx
<EvalChallengerCard
  challenger={{
    run_id: 'run-1',
    requested_logical_model: 'gpt-4',
    status: 'succeeded',
    output_preview: 'This is the output',
    latency: 1500,
  }}
  isWinner={false}
/>
```

### 2. EvalExplanation

显示评测解释，说明为什么选择这些模型。

**Props:**
- `explanation: EvalExplanation` - 评测解释数据

**功能:**
- 显示摘要（summary）
- 显示证据（evidence），包括 policy_version、exploration 等

**使用示例:**
```tsx
<EvalExplanation
  explanation={{
    summary: 'These models were selected based on performance',
    evidence: {
      policy_version: 'v1.0',
      exploration: true,
    },
  }}
/>
```

### 3. EvalRatingDialog

评分对话框，允许用户选择最佳回复并提交原因标签。

**Props:**
- `open: boolean` - 对话框是否打开
- `onOpenChange: (open: boolean) => void` - 关闭对话框的回调
- `baselineRun: { run_id, requested_logical_model, output_preview }` - Baseline run 数据
- `challengers: ChallengerRun[]` - Challenger runs 数据
- `onSubmit: (winnerRunId, reasonTags) => Promise<void>` - 提交评分的回调
- `isSubmitting?: boolean` - 是否正在提交

**功能:**
- 显示所有可选的 runs（baseline + 成功的 challengers）
- 允许选择赢家
- 允许多选原因标签（accurate、complete、concise、safe、fast、cheap）
- 验证必须选择赢家和至少一个原因标签

**使用示例:**
```tsx
<EvalRatingDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  baselineRun={{
    run_id: 'baseline-1',
    requested_logical_model: 'gpt-4',
    output_preview: 'Baseline output',
  }}
  challengers={challengers}
  onSubmit={async (winnerRunId, reasonTags) => {
    await submitRating({ winner_run_id: winnerRunId, reason_tags: reasonTags });
  }}
  isSubmitting={isSubmitting}
/>
```

### 4. EvalPanel

评测面板，整合所有评测相关功能。

**Props:**
- `evalId: string` - 评测 ID
- `onClose?: () => void` - 关闭面板的回调

**功能:**
- 自动轮询评测状态（递增退避：1s → 2s → 3s）
- 显示评测状态（running、ready、rated）
- 显示 baseline 和 challengers
- 显示评测解释
- 提供评分入口（当状态为 ready 时）
- 自动停止轮询（当状态为 ready 或 rated 时）

**使用示例:**
```tsx
<EvalPanel
  evalId="eval-123"
  onClose={() => setShowEval(false)}
/>
```

## 数据流

1. **创建评测**: 用户点击"推荐评测"按钮 → 调用 `createEval` API → 返回 `eval_id`
2. **显示评测面板**: 使用 `eval_id` 渲染 `EvalPanel` 组件
3. **轮询状态**: `EvalPanel` 自动轮询 `getEval` API，更新 challengers 状态
4. **评分**: 用户点击"选择最佳回复" → 打开 `EvalRatingDialog` → 提交评分 → 调用 `submitRating` API
5. **完成**: 评测状态更新为 `rated`，停止轮询

## 状态管理

评测组件使用以下 SWR hooks：

- `useEval(evalId, options)` - 获取评测状态，支持轮询
- `useCreateEval()` - 创建评测的 mutation hook
- `useSubmitRating(evalId)` - 提交评分的 mutation hook

## 国际化

所有文案都通过 `useI18n()` hook 获取，支持中英文：

- `chat.eval.*` - 评测相关文案
- `chat.run.*` - Run 状态相关文案
- `chat.action.*` - 通用操作文案

## 样式

组件使用 shadcn/ui 组件库，遵循极简墨水风格：

- 使用 `Card`、`Badge`、`Button` 等基础组件
- 使用 Tailwind CSS 进行样式定制
- 支持深色模式

## 测试

测试文件位于 `__tests__/eval-components.test.tsx`，包含：

- EvalChallengerCard 的状态渲染测试
- EvalExplanation 的内容显示测试
- EvalRatingDialog 的交互测试

运行测试：
```bash
npm run test -- components/chat/__tests__/eval-components.test.tsx --run
```

## 需求映射

- **EvalChallengerCard**: Requirements 5.2, 5.4
- **EvalExplanation**: Requirements 5.3
- **EvalRatingDialog**: Requirements 6.1, 6.2
- **EvalPanel**: Requirements 5.1-5.8, 6.1, 6.2
