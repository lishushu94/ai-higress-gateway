"use client";

import { useI18n } from "@/lib/i18n-context";

/**
 * 页面头部组件（客户端组件）
 * 负责显示国际化的标题和描述
 */
export function PageHeader() {
  const { t } = useI18n();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">{t("overview.title")}</h1>
      <p className="text-muted-foreground">{t("overview.subtitle")}</p>
    </div>
  );
}
