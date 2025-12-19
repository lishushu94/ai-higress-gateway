"use client";

import { useApiKeys } from "@/lib/swr/use-api-keys";
import { useChatStore } from "@/lib/stores/chat-store";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n-context";
import { Loader2 } from "lucide-react";

/**
 * 项目选择器组件
 * 
 * 用于选择当前使用的项目（API Key）
 * 切换项目时会清空助手和会话选择
 */
export function ProjectSelector() {
  const { t } = useI18n();
  const { apiKeys, loading } = useApiKeys();
  const { selectedProjectId, setSelectedProjectId } = useChatStore();

  // 加载状态
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{t("chat.project.loading")}</span>
      </div>
    );
  }

  // 空状态：没有可用的 API Key
  if (!apiKeys || apiKeys.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        {t("chat.project.empty")}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="project-selector" className="text-sm font-medium">
        {t("chat.project.title")}:
      </label>
      <Select 
        value={selectedProjectId || ""} 
        onValueChange={setSelectedProjectId}
      >
        <SelectTrigger id="project-selector" className="w-[250px]">
          <SelectValue placeholder={t("chat.project.select_placeholder")} />
        </SelectTrigger>
        <SelectContent>
          {apiKeys.map((key) => (
            <SelectItem key={key.id} value={key.id}>
              {key.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
