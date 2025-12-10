"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, AlertCircle, RefreshCw, Share2, Loader2, Shield } from "lucide-react";
import { useProviderDetail } from "@/lib/hooks/use-provider-detail";
import { useProviderAudit } from "@/lib/hooks/use-provider-audit";
import type {
  ProviderModelPricing,
  ProviderAuditStatus,
  ProviderOperationStatus,
  ProviderTestResult,
} from "@/http/provider";
import { providerService } from "@/http/provider";
import { useI18n } from "@/lib/i18n-context";
import { providerSubmissionService } from "@/http/provider-submission";
import { toast } from "sonner";
import { useErrorDisplay } from "@/lib/errors";
import { useAuthStore } from "@/lib/stores/auth-store";
import { ModelPricingDialog } from "./model-pricing-dialog";
import { ModelAliasDialog } from "./model-alias-dialog";
import { StatusBadge } from "./status-badges";
import { ProviderOverviewTab } from "./provider-overview-tab";
import { ProviderSharingConfig } from "./provider-sharing-config";

// 使用 dynamic 导入非首屏 Tab 组件
const ProviderModelsTab = dynamic(() => import("./provider-models-tab").then(mod => ({ default: mod.ProviderModelsTab })), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
  ssr: false,
});

const ProviderKeysTab = dynamic(() => import("./provider-keys-tab").then(mod => ({ default: mod.ProviderKeysTab })), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
  ssr: false,
});

const ProviderMetricsTab = dynamic(() => import("./provider-metrics-tab").then(mod => ({ default: mod.ProviderMetricsTab })), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
  ssr: false,
});

// 审计相关组件使用 dynamic 导入
const ProbeConfigDrawer = dynamic(() => import("./audit/probe-config-drawer").then(mod => ({ default: mod.ProbeConfigDrawer })), {
  loading: () => null,
  ssr: false,
});

const AuditTabContent = dynamic(() => import("./audit/audit-tab-content").then(mod => ({ default: mod.AuditTabContent })), {
  loading: () => <Skeleton className="h-[600px] w-full" />,
  ssr: false,
});

interface ProviderDetailClientProps {
  providerId: string;
  currentUserId?: string | null;
  translations: any;
}

// 加载骨架屏组件
const LoadingSkeleton = ({ loadingText }: { loadingText: string }) => (
  <div className="space-y-6 max-w-7xl">
    <div className="flex items-center gap-4">
      <Skeleton className="h-10 w-10 rounded-md" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
    <div className="text-center text-muted-foreground">{loadingText}</div>
    <Skeleton className="h-[600px] w-full rounded-lg" />
  </div>
);

export function ProviderDetailMain({ providerId, currentUserId, translations }: ProviderDetailClientProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { showError } = useErrorDisplay();
  const authUser = useAuthStore((state) => state.user);
  const authUserId = authUser?.id ?? null;
  const isSuperuser = authUser?.is_superuser ?? false;
  const roleCodes = authUser?.role_codes ?? [];
  const isAdminUser =
    isSuperuser || roleCodes.includes("system_admin") || roleCodes.includes("admin");
  const effectiveUserId = currentUserId ?? authUserId;
  
  // 状态管理
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUserOwnedPrivate, setIsUserOwnedPrivate] = useState<boolean>(false);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [pricingDraft, setPricingDraft] = useState<{ input: string; output: string }>({
    input: "",
    output: "",
  });
  const [pricingLoading, setPricingLoading] = useState(false);
  const [editingAliasModelId, setEditingAliasModelId] = useState<string | null>(null);
  const [aliasDraft, setAliasDraft] = useState("");
  const [aliasLoading, setAliasLoading] = useState(false);
  const { provider, models, health, metrics, loading, error, refresh } = useProviderDetail({
    providerId,
  });

  // 使用审计管理 Hook
  const {
    auditRemark,
    setAuditRemark,
    rejectReason,
    setRejectReason,
    limitQps,
    setLimitQps,
    auditSubmitting,
    recentTests,
    setRecentTests,
    auditLogs,
    setAuditLogs,
    probeEnabled,
    setProbeEnabled,
    probeInterval,
    setProbeInterval,
    probeModel,
    setProbeModel,
    savingProbe,
    probeDrawerOpen,
    setProbeDrawerOpen,
    validationResults,
    validationLoading,
    handleAdminTest,
    handleSaveProbeConfig,
    handleValidateModels,
    handleApprove,
    handleReject,
    handleOperation,
  } = useProviderAudit({ providerId, refresh, translations });

  // 检查是否为用户私有 Provider
  useEffect(() => {
    if (!effectiveUserId) {
      setIsUserOwnedPrivate(false);
      return;
    }

    let cancelled = false;

    const checkPrivateOwnership = async () => {
      try {
        const list = await providerService.getUserPrivateProviders(effectiveUserId);
        const match = list.find((p) => p.provider_id === providerId);
        if (!cancelled) {
          setIsUserOwnedPrivate(!!match);
        }
      } catch (err) {
        console.error("Failed to load user private providers for detail:", err);
        if (!cancelled) {
          setIsUserOwnedPrivate(false);
        }
      }
    };

    checkPrivateOwnership();

    return () => {
      cancelled = true;
    };
  }, [effectiveUserId, providerId]);

  // 同步探针配置
  useEffect(() => {
    if (!provider) return;
    setProbeEnabled(provider.probe_enabled ?? true);
    setProbeInterval(
      provider.probe_interval_seconds != null ? String(provider.probe_interval_seconds) : "",
    );
    setProbeModel(provider.probe_model ?? "");
  }, [provider]);

  // 计算权限
  const permissions = useMemo(() => {
    const hasEffectiveUserId = !!effectiveUserId;
    const providerVisibility = provider?.visibility;
    const providerOwnerId = provider?.owner_id;
    
    const canEditSharing = hasEffectiveUserId && isUserOwnedPrivate;
    const canManageAudit = isAdminUser;
    const isSharedPoolProvider = providerVisibility === "public";
    const canShowAuditUI = canManageAudit && isSharedPoolProvider;
    const canShareToPool = hasEffectiveUserId && 
      (isUserOwnedPrivate || 
       (providerVisibility === "private" && providerOwnerId === effectiveUserId));
    const canManageKeys = canManageAudit || (hasEffectiveUserId && isUserOwnedPrivate);
    const canEditModelMapping = canManageAudit || (hasEffectiveUserId && isUserOwnedPrivate);
    
    return {
      canEditSharing,
      canManageAudit,
      canShowAuditUI,
      canShareToPool,
      canManageKeys,
      canEditModelMapping,
    };
  }, [effectiveUserId, isUserOwnedPrivate, isAdminUser, provider?.visibility, provider?.owner_id]);

  // 管理员加载测试记录与审核日志
  useEffect(() => {
    if (permissions.canShowAuditUI && providerId) {
      const load = async () => {
        try {
          const [tests, logs] = await Promise.all([
            providerService.getProviderTests(providerId, { limit: 5 }),
            providerService.getProviderAuditLogs(providerId, { limit: 10 }),
          ]);
          setRecentTests(tests || []);
          setAuditLogs(logs || []);
        } catch (err) {
          console.warn("Failed to load audit data", err);
        }
      };
      load();
    }
  }, [permissions.canShowAuditUI, providerId]);

  // 事件处理函数
  const handleShareToPool = useCallback(async () => {
    if (!permissions.canShareToPool || !effectiveUserId) {
      return;
    }

    setIsSubmitting(true);
    try {
      await providerSubmissionService.submitFromPrivateProvider(
        effectiveUserId,
        providerId,
      );
      toast.success(t("submissions.toast_submit_success"));
    } catch (error: any) {
      if (error?.response?.status === 403) {
        toast.error(t("submissions.toast_no_permission"));
      } else {
        showError(error, {
          context: t("submissions.toast_submit_error"),
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [permissions.canShareToPool, effectiveUserId, providerId, t, showError]);

  const openPricingEditor = useCallback(async (modelId: string) => {
    if (!providerId) return;
    setEditingModelId(modelId);
    setPricingLoading(true);
    try {
      let pricing: ProviderModelPricing | null = null;
      try {
        pricing = await providerService.getProviderModelPricing(providerId, modelId);
      } catch (err: any) {
        if (err?.response?.status !== 404) {
          throw err;
        }
      }
      setPricingDraft({
        input: pricing?.pricing?.input != null ? String(pricing.pricing.input) : "",
        output: pricing?.pricing?.output != null ? String(pricing.pricing.output) : "",
      });
    } catch (err: any) {
      showError(err, {
        context: t("providers.pricing_load_error"),
      });
      setEditingModelId(null);
    } finally {
      setPricingLoading(false);
    }
  }, [providerId, showError, t]);

  const savePricing = useCallback(async () => {
    if (!providerId || !editingModelId) return;
    setPricingLoading(true);
    try {
      const payload: { input?: number; output?: number } = {};
      if (pricingDraft.input.trim() !== "") {
        payload.input = Number(pricingDraft.input);
      }
      if (pricingDraft.output.trim() !== "") {
        payload.output = Number(pricingDraft.output);
      }
      const body = Object.keys(payload).length > 0 ? payload : null;
      await providerService.updateProviderModelPricing(providerId, editingModelId, body);
      toast.success(t("providers.pricing_save_success"));
      await refresh();
      setEditingModelId(null);
    } catch (err: any) {
      showError(err, {
        context: t("providers.pricing_save_error"),
      });
    } finally {
      setPricingLoading(false);
    }
  }, [providerId, editingModelId, pricingDraft.input, pricingDraft.output, t, refresh, showError]);

  const openAliasEditor = useCallback((modelId: string) => {
    const model = models?.models.find((m) => m.model_id === modelId);
    setEditingAliasModelId(modelId);
    setAliasDraft(model?.alias ?? "");
  }, [models?.models]);

  const saveAlias = useCallback(async () => {
    if (!providerId || !editingAliasModelId) return;
    setAliasLoading(true);
    try {
      const payload: { alias?: string | null } = {};
      const trimmed = aliasDraft.trim();
      payload.alias = trimmed === "" ? null : trimmed;

      await providerService.updateProviderModelAlias(providerId, editingAliasModelId, payload);
      toast.success(t("providers.alias_save_success"));
      await refresh();
      setEditingAliasModelId(null);
    } catch (err: any) {
      showError(err, {
        context: t("providers.alias_save_error"),
      });
    } finally {
      setAliasLoading(false);
    }
  }, [providerId, editingAliasModelId, aliasDraft, t, refresh, showError]);

  const latestTest: ProviderTestResult | null | undefined = useMemo(() => 
    provider?.latest_test_result, [provider?.latest_test_result]
  );

  const historyTabVisible = useMemo(() => 
    permissions.canShowAuditUI && (recentTests.length > 0 || auditLogs.length > 0),
    [permissions.canShowAuditUI, recentTests.length, auditLogs.length]
  );

  // 加载状态
  if (loading && !provider) {
    return <LoadingSkeleton loadingText={translations.loading} />;
  }

  // 错误状态
  if (error && !provider) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {translations.error}: {error.message || "Unknown error"}
          </AlertDescription>
        </Alert>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {translations.back}
          </Button>
          <Button onClick={refresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {translations.retry}
          </Button>
        </div>
      </div>
    );
  }

  // 未找到提供商
  if (!provider) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <div className="text-xl font-semibold">{translations.notFound}</div>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {translations.back}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl animate-in fade-in duration-500">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{provider.name}</h1>
            <div className="flex items-center gap-2 text-muted-foreground mt-1">
              <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                {provider.provider_id}
              </code>
              <span>•</span>
              <span className="text-sm capitalize">{provider.provider_type}</span>
              {provider.visibility && (
                <>
                  <span>•</span>
                  <Badge variant="outline" className="text-xs">
                    {provider.visibility === "private"
                      ? `🔒 ${translations.visibility.private}`
                      : provider.visibility === "restricted"
                        ? `👥 ${t("providers.visibility_restricted")}`
                        : `🌐 ${translations.visibility.public}`}
                  </Badge>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {permissions.canShareToPool && (
            <Button
              variant="default"
              size="sm"
              onClick={handleShareToPool}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("submissions.btn_submitting")}
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4 mr-2" />
                  {t("submissions.share_from_private_button")}
                </>
              )}
            </Button>
          )}
          <StatusBadge status={health?.status} translations={translations.status} />
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {translations.refresh}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">{translations.tabs.overview}</TabsTrigger>
          <TabsTrigger value="models">
            {translations.tabs.models} ({models?.models?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="keys">{translations.tabs.keys}</TabsTrigger>
          <TabsTrigger value="metrics">{translations.tabs.metrics}</TabsTrigger>
          {permissions.canShowAuditUI && (
            <TabsTrigger value="audit">
              <Shield className="h-4 w-4 mr-1" />
              {translations.audit.title}
            </TabsTrigger>
          )}
        </TabsList>

        {/* 概览标签页 */}
        <TabsContent value="overview" className="space-y-6">
          <ProviderOverviewTab
            provider={provider}
            metrics={metrics}
            translations={translations.overview}
          >
            {permissions.canEditSharing && effectiveUserId && (
              <ProviderSharingConfig
                providerId={providerId}
                effectiveUserId={effectiveUserId}
                provider={provider}
              />
            )}
          </ProviderOverviewTab>
        </TabsContent>

        {/* 模型标签页 */}
        <TabsContent value="models">
          <ProviderModelsTab
            models={models}
            canEdit={!!permissions.canEditModelMapping}
            onEditPricing={openPricingEditor}
            onEditAlias={openAliasEditor}
            translations={translations.models}
          />
        </TabsContent>

        {/* API 密钥标签页 */}
        <TabsContent value="keys">
          <ProviderKeysTab
            provider={provider}
            canManage={permissions.canManageKeys}
            translations={translations.keys}
            actionManageKeys={t("providers.action_manage_keys")}
          />
        </TabsContent>

        {/* 指标详情标签页 */}
        <TabsContent value="metrics">
          <ProviderMetricsTab
            metrics={metrics}
            translations={translations.metrics}
          />
        </TabsContent>

        {/* 审核与运营标签页 */}
        {permissions.canShowAuditUI && (
          <TabsContent value="audit">
            <AuditTabContent
              auditStatus={provider.audit_status as ProviderAuditStatus | undefined}
              operationStatus={provider.operation_status as ProviderOperationStatus | undefined}
              latestTest={latestTest}
              auditRemark={auditRemark}
              setAuditRemark={setAuditRemark}
              rejectReason={rejectReason}
              setRejectReason={setRejectReason}
              limitQps={limitQps}
              setLimitQps={setLimitQps}
              auditSubmitting={auditSubmitting}
              onTest={handleAdminTest}
              onApprove={handleApprove}
              onReject={handleReject}
              onPause={() => handleOperation("pause")}
              onResume={() => handleOperation("resume")}
              onOffline={() => handleOperation("offline")}
              validationResults={validationResults}
              validationLoading={validationLoading}
              onValidate={handleValidateModels}
              onOpenProbeDrawer={() => setProbeDrawerOpen(true)}
              recentTests={recentTests}
              auditLogs={auditLogs}
              historyTabVisible={historyTabVisible}
              translations={translations}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* 计费编辑对话框 */}
      <ModelPricingDialog
        open={editingModelId !== null}
        onOpenChange={(open) => !open && setEditingModelId(null)}
        providerId={provider?.provider_id ?? ""}
        modelId={editingModelId ?? ""}
        inputPrice={pricingDraft.input}
        outputPrice={pricingDraft.output}
        onInputPriceChange={(value) =>
          setPricingDraft((prev) => ({ ...prev, input: value }))
        }
        onOutputPriceChange={(value) =>
          setPricingDraft((prev) => ({ ...prev, output: value }))
        }
        onSave={savePricing}
        loading={pricingLoading}
      />

      {/* 别名编辑对话框 */}
      <ModelAliasDialog
        open={editingAliasModelId !== null}
        onOpenChange={(open) => !open && setEditingAliasModelId(null)}
        providerId={provider?.provider_id ?? ""}
        modelId={editingAliasModelId ?? ""}
        alias={aliasDraft}
        onAliasChange={setAliasDraft}
        onSave={saveAlias}
        loading={aliasLoading}
      />

      {/* 探针配置 Drawer */}
      <ProbeConfigDrawer
        open={probeDrawerOpen}
        onOpenChange={setProbeDrawerOpen}
        probeEnabled={probeEnabled}
        setProbeEnabled={setProbeEnabled}
        probeInterval={probeInterval}
        setProbeInterval={setProbeInterval}
        probeModel={probeModel}
        setProbeModel={setProbeModel}
        models={models?.models || []}
        savingProbe={savingProbe}
        onSave={handleSaveProbeConfig}
        translations={{
          probeTitle: translations.audit.probeTitle,
          probeDesc: translations.audit.probeDesc,
          probeToggle: translations.audit.probeToggle,
          probeInterval: translations.audit.probeInterval,
          probeIntervalPlaceholder: translations.audit.probeIntervalPlaceholder,
          probeIntervalHint: translations.audit.probeIntervalHint,
          probeModel: translations.audit.probeModel,
          probeModelPlaceholder: translations.audit.probeModelPlaceholder,
          probeModelHint: translations.audit.probeModelHint,
          probeSave: translations.audit.probeSave,
          probeSaving: translations.audit.probeSaving,
          cancel: t("common.cancel"),
        }}
      />
    </div>
  );
}
