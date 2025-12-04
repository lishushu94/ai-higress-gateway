"use client";

import React, { useState, useEffect } from "react";
import { ProviderPreset, providerPresetService } from "@/http/provider-preset";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PresetSelectorProps {
  selectedPresetId: string | null;
  onPresetSelect: (preset: ProviderPreset | null) => void;
  disabled?: boolean;
  error?: string;
}

export function PresetSelector({
  selectedPresetId,
  onPresetSelect,
  disabled = false,
  error,
}: PresetSelectorProps) {
  const [presets, setPresets] = useState<ProviderPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  // 加载预设列表
  useEffect(() => {
    const loadPresets = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const response = await providerPresetService.getProviderPresets();
        setPresets(response.items);
      } catch (err: any) {
        console.error("加载预设失败:", err);
        setLoadError(err.message || "加载预设失败");
      } finally {
        setIsLoading(false);
      }
    };

    loadPresets();
  }, []);

  // 过滤预设
  const filteredPresets = presets.filter((preset) => {
    const query = searchQuery.toLowerCase();
    return (
      preset.display_name.toLowerCase().includes(query) ||
      preset.preset_id.toLowerCase().includes(query) ||
      preset.description?.toLowerCase().includes(query)
    );
  });

  // 选中的预设
  const selectedPreset = presets.find((p) => p.preset_id === selectedPresetId);

  const handlePresetClick = (preset: ProviderPreset) => {
    if (disabled) return;
    
    // 如果点击已选中的预设，则取消选择
    if (selectedPresetId === preset.preset_id) {
      onPresetSelect(null);
    } else {
      onPresetSelect(preset);
    }
  };

  const handleClearSelection = () => {
    if (disabled) return;
    onPresetSelect(null);
    setSearchQuery("");
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>选择预设（可选）</Label>
        <div className="flex items-center justify-center h-32 border rounded-md bg-muted/40">
          <p className="text-sm text-muted-foreground">加载预设中...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-2">
        <Label>选择预设（可选）</Label>
        <div className="flex items-center justify-center h-32 border rounded-md bg-destructive/10">
          <p className="text-sm text-destructive">{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>选择预设（可选）</Label>
        {selectedPreset && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearSelection}
            disabled={disabled}
            className="h-7 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            清除选择
          </Button>
        )}
      </div>

      {/* 已选预设显示 */}
      {selectedPreset && (
        <Card className="p-3 bg-primary/5 border-primary/20">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Check className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="font-medium text-sm">{selectedPreset.display_name}</span>
                <Badge variant="outline" className="text-xs">
                  {selectedPreset.provider_type === "native" ? "原生" : "聚合"}
                </Badge>
              </div>
              {selectedPreset.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {selectedPreset.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <span>传输: {selectedPreset.transport.toUpperCase()}</span>
                <span>•</span>
                <span className="truncate">{selectedPreset.base_url}</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="搜索预设..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={disabled}
          className="pl-9"
        />
      </div>

      {/* 预设列表 */}
      <div className="max-h-64 overflow-y-auto space-y-2 border rounded-md p-2 bg-muted/20">
        {filteredPresets.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "未找到匹配的预设" : "暂无可用预设"}
            </p>
          </div>
        ) : (
          filteredPresets.map((preset) => {
            const isSelected = selectedPresetId === preset.preset_id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetClick(preset)}
                disabled={disabled}
                className={cn(
                  "w-full text-left p-3 rounded-md border transition-all",
                  "hover:bg-accent hover:border-accent-foreground/20",
                  "focus:outline-none focus:ring-2 focus:ring-ring",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  isSelected
                    ? "bg-primary/10 border-primary/30"
                    : "bg-background border-border"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{preset.display_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {preset.provider_type === "native" ? "原生" : "聚合"}
                      </Badge>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary ml-auto flex-shrink-0" />
                      )}
                    </div>
                    {preset.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {preset.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>ID: {preset.preset_id}</span>
                      <span>•</span>
                      <span>{preset.transport.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <p className="text-xs text-muted-foreground">
        选择预设后，表单将自动填充预设配置。你可以在后续步骤中覆盖任何字段。
      </p>
    </div>
  );
}