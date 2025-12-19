"use client";

import { useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageItem } from "./message-item";
import { useI18n } from "@/lib/i18n-context";
import { useMessages } from "@/lib/swr/use-messages";
import type { Message, RunSummary } from "@/lib/api-types";

export interface MessageListProps {
  conversationId: string;
  onViewDetails?: (runId: string) => void;
  onTriggerEval?: (runId: string) => void;
  showEvalButton?: boolean;
}

export function MessageList({
  conversationId,
  onViewDetails,
  onTriggerEval,
  showEvalButton = true,
}: MessageListProps) {
  const { t } = useI18n();
  const [cursor, setCursor] = useState<string | undefined>();
  const [allMessages, setAllMessages] = useState<
    Array<{ message: Message; run?: RunSummary }>
  >([]);
  const parentRef = useRef<HTMLDivElement>(null);

  // 获取消息列表
  const { messages, nextCursor, isLoading, isError } = useMessages(
    conversationId,
    { cursor, limit: 50 }
  );

  // 合并新消息到列表
  useEffect(() => {
    if (messages.length > 0) {
      setAllMessages((prev) => {
        // 如果是第一次加载或重置
        if (!cursor) {
          return messages;
        }
        // 追加更早的消息（向前分页）
        return [...messages, ...prev];
      });
    }
  }, [messages, cursor]);

  // 虚拟列表配置
  const rowVirtualizer = useVirtualizer({
    count: allMessages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // 估计每条消息的高度
    overscan: 5, // 预渲染的消息数量
  });

  // 加载更多消息（向前分页）
  const loadMore = () => {
    if (nextCursor && !isLoading) {
      setCursor(nextCursor);
    }
  };

  // 滚动到底部
  const scrollToBottom = () => {
    if (parentRef.current) {
      parentRef.current.scrollTop = parentRef.current.scrollHeight;
    }
  };

  // 初始加载完成后滚动到底部
  useEffect(() => {
    if (!isLoading && allMessages.length > 0 && !cursor) {
      setTimeout(scrollToBottom, 100);
    }
  }, [isLoading, allMessages.length, cursor]);

  // 空状态
  if (!isLoading && allMessages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="text-muted-foreground mb-2">
          {t("chat.message.empty")}
        </div>
        <div className="text-sm text-muted-foreground">
          {t("chat.message.empty_description")}
        </div>
      </div>
    );
  }

  // 错误状态
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="text-destructive mb-2">
          {t("chat.message.failed")}
        </div>
        <Button variant="outline" size="sm" onClick={() => setCursor(undefined)}>
          {t("chat.action.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 加载更多按钮 */}
      {nextCursor && (
        <div className="flex justify-center p-4 border-b">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMore}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                {t("chat.message.loading")}
              </>
            ) : (
              t("chat.message.load_more")
            )}
          </Button>
        </div>
      )}

      {/* 虚拟列表容器 */}
      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto px-4 py-6"
        style={{
          contain: "strict",
        }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualItem) => {
            const item = allMessages[virtualItem.index];
            if (!item) return null;

            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <div className="pb-6">
                  <MessageItem
                    message={item.message}
                    run={item.run}
                    onViewDetails={onViewDetails}
                    onTriggerEval={onTriggerEval}
                    showEvalButton={showEvalButton}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 初始加载状态 */}
      {isLoading && allMessages.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">
            {t("chat.message.loading")}
          </span>
        </div>
      )}
    </div>
  );
}
