"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 聊天模块状态管理
 */
interface ChatState {
  // 当前选中的项目（API Key）
  selectedProjectId: string | null;

  // 当前选中的助手和会话
  selectedAssistantId: string | null;
  selectedConversationId: string | null;

  // 评测面板状态
  activeEvalId: string | null;

  // 会话级模型覆盖：conversationId -> logical model（null 表示跟随助手默认）
  conversationModelOverrides: Record<string, string>;

  // 操作方法
  setSelectedProjectId: (projectId: string | null) => void;
  setSelectedAssistant: (assistantId: string | null) => void;
  setSelectedConversation: (conversationId: string | null) => void;
  setActiveEval: (evalId: string | null) => void;
  setConversationModelOverride: (conversationId: string, logicalModel: string | null) => void;
  clearConversationModelOverrides: () => void;
  
  // 重置状态
  reset: () => void;
}

const initialState = {
  selectedProjectId: null,
  selectedAssistantId: null,
  selectedConversationId: null,
  activeEvalId: null,
  conversationModelOverrides: {} as Record<string, string>,
};

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      ...initialState,

      setSelectedProjectId: (projectId) =>
        set({
          selectedProjectId: projectId,
          // 切换项目时清空助手和会话选择
          selectedAssistantId: null,
          selectedConversationId: null,
          conversationModelOverrides: {},
        }),

      setSelectedAssistant: (assistantId) =>
        set({ selectedAssistantId: assistantId }),

      setSelectedConversation: (conversationId) =>
        set({ selectedConversationId: conversationId }),

      setActiveEval: (evalId) =>
        set({ activeEvalId: evalId }),

      setConversationModelOverride: (conversationId, logicalModel) =>
        set((state) => {
          const next = { ...state.conversationModelOverrides };
          if (!logicalModel) {
            delete next[conversationId];
          } else {
            next[conversationId] = logicalModel;
          }
          return { conversationModelOverrides: next };
        }),

      clearConversationModelOverrides: () => set({ conversationModelOverrides: {} }),

      reset: () => set(initialState),
    }),
    {
      name: 'chat-store',
      version: 2,
      migrate: (persistedState: any) => {
        // v1 -> v2: add conversationModelOverrides
        if (persistedState && typeof persistedState === 'object') {
          return {
            ...persistedState,
            conversationModelOverrides: persistedState.conversationModelOverrides ?? {},
          };
        }
        return persistedState;
      },
    }
  )
);
