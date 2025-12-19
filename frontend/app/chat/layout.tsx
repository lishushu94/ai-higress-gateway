"use client";

import dynamic from "next/dynamic";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { AssistantList } from "@/components/chat/assistant-list";
import { ConversationList } from "@/components/chat/conversation-list";
import { useChatStore } from "@/lib/stores/chat-store";
import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAssistants, useCreateAssistant, useUpdateAssistant, useDeleteAssistant } from "@/lib/swr/use-assistants";
import { useConversations, useCreateConversation, useDeleteConversation } from "@/lib/swr/use-conversations";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n-context";
import type { Assistant, CreateAssistantRequest, UpdateAssistantRequest, CreateConversationRequest } from "@/lib/api-types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// 动态导入助手表单（仅在打开对话框时加载）
const AssistantForm = dynamic(
  () => import("@/components/chat/assistant-form").then((mod) => ({ default: mod.AssistantForm })),
  { ssr: false }
);

/**
 * 聊天模块布局
 * 
 * 包含：
 * - 左侧边栏：助手列表 + 会话列表（可调整宽度）
 * - 主内容区：聊天页面或提示页面
 */
export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { selectedAssistantId, setSelectedAssistant, setSelectedConversation } = useChatStore();

  // 对话框状态
  const [isAssistantDialogOpen, setIsAssistantDialogOpen] = useState(false);
  const [editingAssistant, setEditingAssistant] = useState<Assistant | null>(null);
  const [deleteConfirmAssistant, setDeleteConfirmAssistant] = useState<string | null>(null);
  const [deleteConfirmConversation, setDeleteConfirmConversation] = useState<string | null>(null);

  // 未登录时重定向到首页
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  // 加载中或未登录时不渲染
  if (isLoading || !user) {
    return null;
  }

  // TODO: 在 MVP 阶段，使用用户 ID 作为 project_id
  const projectId = user.id;

  // 获取助手列表
  const { assistants, isLoading: isLoadingAssistants, mutate: mutateAssistants } = useAssistants({
    project_id: projectId,
    limit: 50,
  });

  // 获取会话列表（仅当选中助手时）
  const { conversations, isLoading: isLoadingConversations, mutate: mutateConversations } = useConversations(
    selectedAssistantId
      ? {
          assistant_id: selectedAssistantId,
          limit: 50,
        }
      : { assistant_id: '', limit: 0 }
  );

  // Mutation hooks
  const createAssistant = useCreateAssistant();
  const updateAssistant = useUpdateAssistant();
  const deleteAssistant = useDeleteAssistant();
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();

  // 助手操作
  const handleSelectAssistant = (assistantId: string) => {
    setSelectedAssistant(assistantId);
    setSelectedConversation(null);
    router.push(`/chat/${assistantId}`);
  };

  const handleCreateAssistant = () => {
    setEditingAssistant(null);
    setIsAssistantDialogOpen(true);
  };

  const handleEditAssistant = (assistant: Assistant) => {
    setEditingAssistant(assistant);
    setIsAssistantDialogOpen(true);
  };

  const handleSaveAssistant = async (data: CreateAssistantRequest | UpdateAssistantRequest) => {
    try {
      if (editingAssistant) {
        await updateAssistant(editingAssistant.assistant_id, data as UpdateAssistantRequest);
        toast.success(t('chat.assistant.updated'));
      } else {
        const newAssistant = await createAssistant({ ...data, project_id: projectId } as CreateAssistantRequest);
        toast.success(t('chat.assistant.created'));
        handleSelectAssistant(newAssistant.assistant_id);
      }
      setIsAssistantDialogOpen(false);
      mutateAssistants();
    } catch (error) {
      console.error('Failed to save assistant:', error);
      toast.error(t('chat.errors.invalid_config'));
    }
  };

  const handleDeleteAssistant = async (assistantId: string) => {
    setDeleteConfirmAssistant(assistantId);
  };

  const confirmDeleteAssistant = async () => {
    if (!deleteConfirmAssistant) return;
    try {
      await deleteAssistant(deleteConfirmAssistant);
      toast.success(t('chat.assistant.deleted'));
      if (selectedAssistantId === deleteConfirmAssistant) {
        setSelectedAssistant(null);
        setSelectedConversation(null);
        router.push('/chat');
      }
      mutateAssistants();
    } catch (error) {
      console.error('Failed to delete assistant:', error);
      toast.error(t('chat.errors.invalid_config'));
    } finally {
      setDeleteConfirmAssistant(null);
    }
  };

  // 会话操作
  const handleSelectConversation = (conversationId: string) => {
    if (!selectedAssistantId) return;
    setSelectedConversation(conversationId);
    router.push(`/chat/${selectedAssistantId}/${conversationId}`);
  };

  const handleCreateConversation = async () => {
    if (!selectedAssistantId) return;
    try {
      const newConversation = await createConversation({
        assistant_id: selectedAssistantId,
        project_id: projectId,
      } as CreateConversationRequest);
      toast.success(t('chat.conversation.created'));
      handleSelectConversation(newConversation.conversation_id);
      mutateConversations();
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast.error(t('chat.errors.invalid_config'));
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    setDeleteConfirmConversation(conversationId);
  };

  const confirmDeleteConversation = async () => {
    if (!deleteConfirmConversation) return;
    try {
      await deleteConversation(deleteConfirmConversation);
      toast.success(t('chat.conversation.deleted'));
      mutateConversations();
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      toast.error(t('chat.errors.invalid_config'));
    } finally {
      setDeleteConfirmConversation(null);
    }
  };

  return (
    <>
      <div className="flex h-screen bg-background overflow-hidden w-full">
        <ResizablePanelGroup direction="horizontal">
          {/* 左侧边栏：助手列表 + 会话列表 */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <div className="flex flex-col h-full border-r">
              {/* 助手列表区域 */}
              <div className="flex-1 overflow-y-auto border-b">
                <AssistantList
                  assistants={assistants}
                  isLoading={isLoadingAssistants}
                  selectedAssistantId={selectedAssistantId || undefined}
                  onSelectAssistant={handleSelectAssistant}
                  onCreateAssistant={handleCreateAssistant}
                  onEditAssistant={handleEditAssistant}
                  onDeleteAssistant={handleDeleteAssistant}
                />
              </div>

              {/* 会话列表区域 */}
              {selectedAssistantId && (
                <div className="flex-1 overflow-y-auto">
                  <ConversationList
                    conversations={conversations}
                    isLoading={isLoadingConversations}
                    onSelectConversation={handleSelectConversation}
                    onCreateConversation={handleCreateConversation}
                    onDeleteConversation={handleDeleteConversation}
                  />
                </div>
              )}
            </div>
          </ResizablePanel>

          {/* 调整宽度的手柄 */}
          <ResizableHandle withHandle />

          {/* 主内容区 */}
          <ResizablePanel defaultSize={80}>
            <div className="h-full overflow-hidden">
              {children}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* 助手创建/编辑对话框 */}
      <AssistantForm
        open={isAssistantDialogOpen}
        onOpenChange={setIsAssistantDialogOpen}
        editingAssistant={editingAssistant}
        projectId={projectId}
        onSubmit={handleSaveAssistant}
      />

      {/* 删除助手确认对话框 */}
      <AlertDialog open={!!deleteConfirmAssistant} onOpenChange={() => setDeleteConfirmAssistant(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('chat.assistant.delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('chat.assistant.delete_confirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('chat.action.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAssistant}>
              {t('chat.action.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除会话确认对话框 */}
      <AlertDialog open={!!deleteConfirmConversation} onOpenChange={() => setDeleteConfirmConversation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('chat.conversation.delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('chat.conversation.delete_confirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('chat.action.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteConversation}>
              {t('chat.action.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
