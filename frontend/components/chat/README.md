# Chat Assistant Components

聊天助手系统的 UI 组件库。

## 组件列表

### AssistantCard

助手卡片组件，用于显示单个助手的信息。

**功能：**
- 显示助手名称和默认模型
- 提供编辑、归档、删除操作按钮
- 支持选中状态高亮
- 二次确认对话框（归档和删除）

**Props：**
```typescript
interface AssistantCardProps {
  assistant: Assistant;
  isSelected?: boolean;
  onSelect?: (assistantId: string) => void;
  onEdit?: (assistant: Assistant) => void;
  onArchive?: (assistantId: string) => void;
  onDelete?: (assistantId: string) => void;
}
```

**使用示例：**
```tsx
<AssistantCard
  assistant={assistant}
  isSelected={selectedId === assistant.assistant_id}
  onSelect={handleSelect}
  onEdit={handleEdit}
  onArchive={handleArchive}
  onDelete={handleDelete}
/>
```

### AssistantList

助手列表组件，用于显示和管理多个助手。

**功能：**
- 显示助手列表
- 支持选中助手
- 提供"新建助手"按钮
- 支持分页加载
- 空状态和加载状态处理

**Props：**
```typescript
interface AssistantListProps {
  assistants: Assistant[];
  isLoading?: boolean;
  selectedAssistantId?: string;
  onSelectAssistant?: (assistantId: string) => void;
  onCreateAssistant?: () => void;
  onEditAssistant?: (assistant: Assistant) => void;
  onArchiveAssistant?: (assistantId: string) => void;
  onDeleteAssistant?: (assistantId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}
```

**使用示例：**
```tsx
<AssistantList
  assistants={assistants}
  isLoading={isLoading}
  selectedAssistantId={selectedId}
  onSelectAssistant={handleSelect}
  onCreateAssistant={handleCreate}
  onEditAssistant={handleEdit}
  onArchiveAssistant={handleArchive}
  onDeleteAssistant={handleDelete}
  onLoadMore={handleLoadMore}
  hasMore={hasMore}
/>
```

### AssistantForm

助手创建/编辑表单组件。

**功能：**
- 创建新助手
- 编辑现有助手
- 使用 React Hook Form + Zod 验证
- 支持助手名称、系统提示词、默认模型配置

**Props：**
```typescript
interface AssistantFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingAssistant?: Assistant | null;
  projectId: string;
  onSubmit: (data: CreateAssistantRequest | UpdateAssistantRequest) => Promise<void>;
  isSubmitting?: boolean;
  availableModels?: string[];
}
```

**使用示例：**
```tsx
<AssistantForm
  open={isFormOpen}
  onOpenChange={setIsFormOpen}
  editingAssistant={editingAssistant}
  projectId={projectId}
  onSubmit={handleSubmit}
  isSubmitting={isSubmitting}
  availableModels={["auto", "gpt-4", "claude-3-opus"]}
/>
```

## 依赖

这些组件依赖以下模块：

- `@/components/ui/*` - shadcn/ui 组件库
- `@/lib/api-types` - API 类型定义
- `@/lib/i18n-context` - 国际化支持
- `react-hook-form` - 表单管理
- `zod` - 表单验证
- `lucide-react` - 图标库

## 国际化

所有用户可见的文案都通过 `useI18n()` hook 获取，文案定义在 `frontend/lib/i18n/chat.ts` 中。

## 样式

组件遵循项目的极简墨水风格设计，使用 Tailwind CSS 和 shadcn/ui 组件库。

### ConversationItem

会话列表项组件，用于显示单个会话的信息。

**功能：**
- 显示会话标题和最后活动时间
- 提供归档、删除操作按钮
- 支持选中状态高亮
- 二次确认对话框（归档和删除）
- 智能时间格式化（刚刚、X分钟前、X小时前、X天前）

**Props：**
```typescript
interface ConversationItemProps {
  conversation: Conversation;
  isSelected?: boolean;
  onSelect?: (conversationId: string) => void;
  onArchive?: (conversationId: string) => void;
  onDelete?: (conversationId: string) => void;
}
```

**使用示例：**
```tsx
<ConversationItem
  conversation={conversation}
  isSelected={selectedId === conversation.conversation_id}
  onSelect={handleSelect}
  onArchive={handleArchive}
  onDelete={handleDelete}
/>
```

### ConversationList

会话列表组件，用于显示和管理多个会话。

**功能：**
- 显示会话列表（按 last_activity_at 倒序）
- 支持选中会话
- 提供"新建会话"按钮
- 支持分页加载
- 空状态和加载状态处理

**Props：**
```typescript
interface ConversationListProps {
  conversations: Conversation[];
  isLoading?: boolean;
  selectedConversationId?: string;
  onSelectConversation?: (conversationId: string) => void;
  onCreateConversation?: () => void;
  onArchiveConversation?: (conversationId: string) => void;
  onDeleteConversation?: (conversationId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}
```

**使用示例：**
```tsx
<ConversationList
  conversations={conversations}
  isLoading={isLoading}
  selectedConversationId={selectedId}
  onSelectConversation={handleSelect}
  onCreateConversation={handleCreate}
  onArchiveConversation={handleArchive}
  onDeleteConversation={handleDelete}
  onLoadMore={handleLoadMore}
  hasMore={hasMore}
/>
```

## Requirements

这些组件实现了以下需求：

### 助手管理
- **Requirements 1.1**: 创建助手（名称、系统提示词、默认模型）
- **Requirements 1.2**: 编辑助手
- **Requirements 1.3**: 归档助手
- **Requirements 1.4**: 删除助手（带二次确认）
- **Requirements 1.5**: 显示助手列表，支持分页
- **Requirements 1.6**: 查看助手详情

### 会话管理
- **Requirements 2.1**: 创建会话
- **Requirements 2.2**: 显示会话列表（按时间倒序），支持分页
- **Requirements 2.3**: 归档会话
- **Requirements 2.6**: 删除会话（带二次确认）

### MessageItem

消息项组件，用于显示单条消息。

**功能：**
- 显示消息内容和时间
- 区分用户消息和助手回复
- 显示 Run 摘要信息（模型、状态、延迟）
- 提供"查看详情"和"推荐评测"按钮
- 悬停显示操作按钮

**Props：**
```typescript
interface MessageItemProps {
  message: Message;
  run?: RunSummary;
  onViewDetails?: (runId: string) => void;
  onTriggerEval?: (runId: string) => void;
  showEvalButton?: boolean;
}
```

**使用示例：**
```tsx
<MessageItem
  message={message}
  run={run}
  onViewDetails={handleViewDetails}
  onTriggerEval={handleTriggerEval}
  showEvalButton={true}
/>
```

### MessageList

消息列表组件，用于显示会话中的消息历史。

**功能：**
- 显示消息列表
- 支持分页加载（向前加载更早的消息）
- 使用虚拟列表优化性能（@tanstack/react-virtual）
- 自动滚动到底部
- 空状态和加载状态处理

**Props：**
```typescript
interface MessageListProps {
  conversationId: string;
  onViewDetails?: (runId: string) => void;
  onTriggerEval?: (runId: string) => void;
  showEvalButton?: boolean;
}
```

**使用示例：**
```tsx
<MessageList
  conversationId={conversationId}
  onViewDetails={handleViewDetails}
  onTriggerEval={handleTriggerEval}
  showEvalButton={true}
/>
```

### MessageInput

消息输入框组件，用于发送消息。

**功能：**
- 实现消息输入框
- 实现发送按钮
- 实现乐观更新
- 处理归档会话的禁用状态
- 自动调整 textarea 高度
- 支持 Ctrl/Cmd + Enter 快捷键发送

**Props：**
```typescript
interface MessageInputProps {
  conversationId: string;
  disabled?: boolean;
  onMessageSent?: (message: Message) => void;
  className?: string;
}
```

**使用示例：**
```tsx
<MessageInput
  conversationId={conversationId}
  disabled={conversation?.archived}
  onMessageSent={handleMessageSent}
/>
```

### RunDetailDialog

Run 详情对话框组件，用于显示模型运行的完整详情。

**功能：**
- 显示 run 的完整详情（request、response、tokens、cost）
- 使用 Dialog 组件
- 显示状态、延迟、错误信息
- 格式化 JSON 数据
- 惰性加载详情数据

**Props：**
```typescript
interface RunDetailDialogProps {
  runId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

**使用示例：**
```tsx
<RunDetailDialog
  runId={selectedRunId}
  open={isDialogOpen}
  onOpenChange={setIsDialogOpen}
/>
```

## 消息和聊天功能

这些组件实现了以下需求：

### 消息发送与显示
- **Requirements 3.1**: 发送消息并创建用户消息记录
- **Requirements 3.2**: 同步执行 baseline run
- **Requirements 3.5**: 创建助手回复消息并关联 run_id
- **Requirements 4.1**: 显示消息列表，支持分页
- **Requirements 4.2**: 消息列表只包含 run 摘要（轻量化）
- **Requirements 4.3**: 惰性加载 run 详情

### UI 交互体验
- **Requirements 8.1**: 乐观更新（立即显示用户消息）
- **Requirements 8.2**: 显示加载状态
- **Requirements 8.3**: 立即渲染助手回复

### 性能优化
- **Requirements 9.4**: 使用虚拟列表优化大量消息渲染
