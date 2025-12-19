"use client";

import dynamic from "next/dynamic";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/lib/i18n-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useEvalConfig, useUpdateEvalConfig } from "@/lib/swr/use-eval-config";
import { toast } from "sonner";
import type { UpdateEvalConfigRequest } from "@/lib/api-types";

// 动态导入评测配置表单（管理员专用功能）
const EvalConfigForm = dynamic(
  () => import("@/components/dashboard/eval-config-form").then((mod) => ({ default: mod.EvalConfigForm })),
  {
    loading: () => (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    ),
    ssr: false,
  }
);

/**
 * 评测配置页
 * 
 * 仅管理员可访问，用于配置项目的评测参数
 */
export default function EvalConfigPage() {
  const { t } = useI18n();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // 权限检查：仅超级用户可访问
  useEffect(() => {
    if (!isLoading && (!user || !user.is_superuser)) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <div className="text-muted-foreground">
            {t('chat.eval_config.loading')}
          </div>
        </div>
      </div>
    );
  }

  if (!user || !user.is_superuser) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4 max-w-md px-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-muted p-6">
              <Shield className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              {t('chat.errors.action_contact_admin')}
            </h2>
            <p className="text-muted-foreground">
              此页面仅管理员可访问
            </p>
          </div>
        </div>
      </div>
    );
  }

  // TODO: 在 MVP 阶段，使用用户 ID 作为 project_id
  const projectId = user.id;

  const { config, isLoading: isLoadingConfig } = useEvalConfig(projectId);
  const updateEvalConfig = useUpdateEvalConfig();

  const handleSubmit = async (data: UpdateEvalConfigRequest) => {
    try {
      await updateEvalConfig(projectId, data);
      toast.success(t('chat.eval_config.saved'));
    } catch (error) {
      console.error('Failed to update eval config:', error);
      toast.error(t('chat.errors.invalid_config'));
      throw error;
    }
  };

  if (isLoadingConfig) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <div className="text-muted-foreground">
            {t('chat.eval_config.loading')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('chat.eval_config.title')}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t('chat.eval_config.subtitle')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('chat.eval_config.title')}</CardTitle>
          <CardDescription>
            {t('chat.eval_config.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EvalConfigForm
            config={config || null}
            onSubmit={handleSubmit}
          />
        </CardContent>
      </Card>
    </div>
  );
}
