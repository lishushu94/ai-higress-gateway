"use client";

import { useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  model?: string;
}

interface MessageListVirtualProps {
  messages: Message[];
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
}

export function MessageListVirtual({
  messages,
  hasMore,
  isLoading,
  onLoadMore,
}: MessageListVirtualProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // 虚拟化配置
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 150, // 预估每条消息高度
    overscan: 5, // 预渲染上下各 5 条
  });

  // 监听滚动到顶部，触发加载更多
  useEffect(() => {
    const [firstItem] = virtualizer.getVirtualItems();
    
    if (!firstItem) return;
    
    // 当滚动到接近顶部时，加载更多历史消息
    if (firstItem.index === 0 && hasMore && !isLoading) {
      onLoadMore();
    }
  }, [
    virtualizer.getVirtualItems(),
    hasMore,
    isLoading,
    onLoadMore,
  ]);

  // 自动滚动到底部（新消息到达时）
  useEffect(() => {
    if (messages.length > 0) {
      virtualizer.scrollToIndex(messages.length - 1, {
        align: "end",
        behavior: "smooth",
      });
    }
  }, [messages.length]);

  return (
    <div
      ref={parentRef}
      className="flex-1 overflow-y-auto"
      style={{ contain: "strict" }}
    >
      {/* 加载更多指示器 */}
      {isLoading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* 虚拟化列表容器 */}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const message = messages[virtualItem.index];
          const isUser = message.role === "user";

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div className="px-4 py-3 max-w-4xl mx-auto">
                {/* 用户消息 */}
                {isUser ? (
                  <div className="flex gap-3 justify-end">
                    <Card className="max-w-[80%] bg-primary text-primary-foreground">
                      <CardContent className="p-4">
                        <p className="text-sm whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </CardContent>
                    </Card>
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <div className="w-full h-full bg-primary/20 flex items-center justify-center text-xs">
                        U
                      </div>
                    </Avatar>
                  </div>
                ) : (
                  /* 助手消息 */
                  <div className="flex gap-3">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <div className="w-full h-full bg-muted flex items-center justify-center text-lg">
                        🤖
                      </div>
                    </Avatar>
                    <Card className="max-w-[80%] bg-muted">
                      <CardContent className="p-4">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </p>
                        {message.model && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {message.model}
                          </div>
                        )}
                        <div className="mt-3 pt-3 border-t">
                          <Button variant="outline" size="sm">
                            推荐评测
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 没有更多消息提示 */}
      {!hasMore && messages.length > 0 && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          已加载全部消息
        </div>
      )}
    </div>
  );
}
