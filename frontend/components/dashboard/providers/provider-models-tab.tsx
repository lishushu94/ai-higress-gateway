"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Layers } from "lucide-react";
import type { ModelsResponse, Model } from "@/http/provider";
import { ModelCard } from "./model-card";

interface ProviderModelsTabProps {
  providerId: string;
  models?: ModelsResponse;
  canEdit: boolean;
  onEditPricing: (modelId: string) => void;
  onEditAlias: (modelId: string) => void;
  onRefresh: () => Promise<void>;
  translations: {
    title: string;
    description: string;
    noModels: string;
  };
}

export const ProviderModelsTab = ({
  providerId,
  models,
  canEdit,
  onEditPricing,
  onEditAlias,
  onRefresh,
  translations
}: ProviderModelsTabProps) => {
  const modelCount = models?.models?.length || 0;
  
  // 按 family 分组模型
  const groupedModels = useMemo(() => {
    if (!models?.models || models.models.length === 0) return {};
    
    const groups: Record<string, Model[]> = {};
    models.models.forEach((model) => {
      const family = model.family || "other";
      if (!groups[family]) {
        groups[family] = [];
      }
      groups[family].push(model);
    });
    
    // 按 family 名称排序
    return Object.keys(groups)
      .sort()
      .reduce((acc, key) => {
        acc[key] = groups[key];
        return acc;
      }, {} as Record<string, Model[]>);
  }, [models?.models]);
  
  return (
    <div className="space-y-6">
      {/* 标题区域 */}
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-primary/10 text-primary">
          <Layers className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight mb-1">
            {translations.title}
          </h2>
          <p className="text-muted-foreground">
            {translations.description}
            {modelCount > 0 && (
              <span className="ml-2 text-primary font-medium">
                • {modelCount} {modelCount === 1 ? 'model' : 'models'}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* 模型卡片网格 - 按 family 分组 */}
      {!models?.models || models.models.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Layers className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-center">
              {translations.noModels}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedModels).map(([family, familyModels]) => (
            <div key={family} className="space-y-4">
              {/* Family 标题 */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1 bg-muted/50 rounded-full">
                  {family}
                  <span className="ml-2 text-xs font-normal text-muted-foreground/70">
                    ({familyModels.length})
                  </span>
                </h3>
                <div className="h-px flex-1 bg-border" />
              </div>
              
              {/* 该 family 下的模型卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {familyModels.map((model) => (
                  <ModelCard
                    key={model.model_id}
                    providerId={providerId}
                    model={model}
                    canEdit={canEdit}
                    onEditPricing={() => onEditPricing(model.model_id)}
                    onEditAlias={() => onEditAlias(model.model_id)}
                    onRefresh={onRefresh}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
