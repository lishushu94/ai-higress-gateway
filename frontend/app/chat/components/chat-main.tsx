"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, Mic } from "lucide-react";
import { MessageListVirtual } from "./message-list-virtual";

// 模拟消息数据（后续替换为真实 API）
const mockMessages = Array.from({ length: 100 }, (_, i) => ({
  id: `msg-${i}`,
  role: i % 2 === 0 ? "user" : "assistant",
  content:
    i % 2 === 0
      ? `这是用户消息 ${i + 1}`
      : `这是助手回复 ${i + 1}。优化 API 性能可以从以下几个方面入手：\n1. 使用缓存策略减少数据库查询\n2. 实现分页和懒加载\n3. 优化数据库索引\n4. 使用 CDN 加速静态资源`,
  timestamp: new Date(Date.now() - i * 60000).toISOString(),
  model: i % 2 === 1 ? "claude-4.5-sonnet" : undefined,
})) as Array<{
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  model?: string;
}>;

export function ChatMain() {
  const [messages, setMessages] = useState(mockMessages.slice(0, 20));
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");

  // 加载更多历史消息（向上滚动时触发）
  const handleLoadMore = () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);

    // 模拟 API 请求延迟
    setTimeout(() => {
      const currentLength = messages.length;
      const nextBatch = mockMessages.slice(
        currentLength,
        currentLength + 20
      );

      if (nextBatch.length === 0) {
        setHasMore(false);
      } else {
        setMessages((prev) => [...nextBatch, ...prev]);
      }

      setIsLoading(false);
    }, 1000);
  };

  // 发送消息
  const handleSend = () => {
    if (!inputValue.trim()) return;

    const newMessage = {
      id: `msg-new-${Date.now()}`,
      role: "user" as const,
      content: inputValue,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue("");

    // 模拟助手回复
    setTimeout(() => {
      const assistantReply = {
        id: `msg-reply-${Date.now()}`,
        role: "assistant" as const,
        content: "这是助手的回复...",
        timestamp: new Date().toISOString(),
        model: "claude-4.5-sonnet",
      };
      setMessages((prev) => [...prev, assistantReply]);
    }, 1000);
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* 顶部：当前助手信息 */}
      <div className="border-b p-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🎓</div>
          <div className="flex-1">
            <h2 className="font-semibold text-lg">斯坦福教授</h2>
            <p className="text-sm text-muted-foreground">claude-4.5-sonnet</p>
          </div>
          <div className="text-sm text-muted-foreground">
            共 {messages.length} 条消息
          </div>
        </div>
      </div>

      {/* 中间：虚拟化消息列表 */}
      {messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-8">
            <div className="text-6xl mb-4">👋</div>
            <h3 className="text-2xl font-semibold mb-2">中午好</h3>
            <p className="text-muted-foreground">
              我是您的AI智能助手，请问我能帮您做些什么？
            </p>
          </div>
        </div>
      ) : (
        <MessageListVirtual
          messages={messages}
          hasMore={hasMore}
          isLoading={isLoading}
          onLoadMore={handleLoadMore}
        />
      )}

      {/* 底部：输入框 */}
      <div className="border-t p-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入您的消息，按 Ctrl + Enter 键发送..."
              className="min-h-[80px] pr-24 resize-none"
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <Mic className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                className="h-8 w-8"
                onClick={handleSend}
                disabled={!inputValue.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground text-center">
            AI 可能会犯错，请核实重要信息
          </div>
        </div>
      </div>
    </div>
  );
}
