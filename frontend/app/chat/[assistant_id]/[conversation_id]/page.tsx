"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { MessageList } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";
import { useConversation } from "@/lib/swr/use-conversations";
import { useChatStore } from "@/lib/stores/chat-store";
import { useI18n } from "@/lib/i18n-context";
import { useCreateEval } from "@/lib/swr/use-evals";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// 动态导入评测面板（代码分割）
const EvalPanel = dynamic(
  () => import("@/components/chat/eval-panel").then((mod) => ({ default: mod.EvalPanel })),
  {
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    ),
    ssr: false,
  }
);

/**
 * 会话聊天页
 * 
 * 集成消息列表、消息输入和评测面板
 */
export default function ConversationPage() {
  const { t } = useI18n();
  const params = useParams();
  const { user } = useAuth();
  const assistantId = params.assistant_id as string;
  const conversationId = params.conversation_id as string;

  const { conversation, isLoading } = useConversation(conversationId);
  const { activeEvalId, setActiveEval } = useChatStore();
  const createEval = useCreateEval();

  const handleTriggerEval = async (baselineRunId: string) => {
    if (!user) return;

    try {
      // TODO: 在 MVP 阶段，使用用户 ID 作为 project_id
      const result = await createEval({
        project_id: user.id,
        assistant_id: assistantId,
        conversation_id: conversationId,
        message_id: '', // 从 baselineRunId 可以推断出 message_id
        baseline_run_id: baselineRunId,
      });

      setActiveEval(result.eval_id);
      toast.success(t('chat.eval.trigger_success'));
    } catch (error) {
      console.error('Failed to trigger eval:', error);
      toast.error(t('chat.eval.trigger_failed'));
    }
  };

  const handleCloseEval = () => {
    setActiveEval(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <div className="text-muted-foreground">
            {t('chat.conversation.loading')}
          </div>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <div className="text-muted-foreground">
            {t('chat.errors.conversation_not_found')}
          </div>
        </div>
      </div>
    );
  }

  const isArchived = conversation.archived;

  return (
    <div className="flex flex-col h-full">
      {/* 归档提示 */}
      {isArchived && (
        <div className="bg-muted/50 border-b px-4 py-2 text-sm text-muted-foreground text-center">
          {t('chat.conversation.archived_notice')}
        </div>
      )}

      {/* 消息列表 */}
      <div className="flex-1 overflow-hidden">
        <MessageList
          conversationId={conversationId}
          onTriggerEval={handleTriggerEval}
        />
      </div>

      {/* 消息输入框 */}
      <div className="border-t p-4">
        <MessageInput
          conversationId={conversationId}
          disabled={isArchived}
        />
      </div>

      {/* 评测面板 */}
      {activeEvalId && (
        <div className="fixed inset-y-0 right-0 w-96 border-l bg-background shadow-lg z-50 overflow-y-auto">
          <EvalPanel evalId={activeEvalId} onClose={handleCloseEval} />
        </div>
      )}
    </div>
  );
}
