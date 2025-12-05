"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ProviderPreset,
  providerPresetService,
} from "@/http/provider-preset";
import { useProviderPresets } from "@/lib/hooks/use-provider-presets";
import { ProviderPresetTable } from "@/components/dashboard/provider-presets/provider-preset-table";
import { ProviderPresetForm } from "@/components/dashboard/provider-presets/provider-preset-form";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ProviderPresetsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<ProviderPreset | undefined>();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingPresetId, setDeletingPresetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 使用自定义 Hook + SWR 获取数据
  const {
    presets,
    loading: isLoading,
    error,
    refresh,
  } = useProviderPresets();

  // 本地搜索过滤
  const filteredPresets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return presets;

    return presets.filter((preset) => {
      const displayName = preset.display_name?.toLowerCase() ?? "";
      const presetId = preset.preset_id?.toLowerCase() ?? "";
      const description = preset.description?.toLowerCase() ?? "";
      const baseUrl = preset.base_url?.toLowerCase() ?? "";

      return (
        displayName.includes(query) ||
        presetId.includes(query) ||
        description.includes(query) ||
        baseUrl.includes(query)
      );
    });
  }, [presets, searchQuery]);

  // 打开创建表单
  const handleCreate = () => {
    setEditingPreset(undefined);
    setFormOpen(true);
  };

  // 打开编辑表单
  const handleEdit = (preset: ProviderPreset) => {
    setEditingPreset(preset);
    setFormOpen(true);
  };

  // 打开删除确认
  const handleDeleteClick = (presetId: string) => {
    setDeletingPresetId(presetId);
    setDeleteConfirmOpen(true);
  };

  // 确认删除
  const handleDeleteConfirm = async () => {
    if (!deletingPresetId) return;

    setIsDeleting(true);
    try {
      await providerPresetService.deleteProviderPreset(deletingPresetId);
      toast.success("预设删除成功");
      await refresh(); // 刷新列表
    } catch (error: any) {
      console.error("删除失败:", error);
      const message = error.response?.data?.detail || error.message || "删除失败";
      toast.error(message);
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
      setDeletingPresetId(null);
    }
  };

  // 表单提交成功
  const handleFormSuccess = () => {
    refresh(); // 刷新列表
  };

  if (error) {
    const errorMessage =
      (error as any)?.message || "加载失败";
    return (
      <div className="space-y-6 max-w-7xl">
        <div>
          <h1 className="text-3xl font-bold mb-2">提供商预设管理</h1>
          <p className="text-muted-foreground">管理官方提供商预设配置</p>
        </div>
        <div className="rounded-md border border-destructive p-8 text-center">
          <p className="text-destructive">加载失败: {errorMessage}</p>
          <Button onClick={() => refresh()} className="mt-4">
            重试
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* 页面标题、搜索框和创建按钮 */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">提供商预设管理</h1>
          <p className="text-muted-foreground text-sm">
            管理官方提供商预设配置，用户可在创建私有提供商时选择使用
          </p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索预设（ID / 名称 / 描述 / Base URL）..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={handleCreate} className="md:ml-2">
            <Plus className="w-4 h-4 mr-2" />
            创建预设
          </Button>
        </div>
      </div>

      {/* 预设列表表格 */}
      <ProviderPresetTable
        presets={filteredPresets}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
      />

      {/* 创建/编辑表单对话框 */}
      <ProviderPresetForm
        open={formOpen}
        onOpenChange={setFormOpen}
        preset={editingPreset}
        onSuccess={handleFormSuccess}
      />

      {/* 删除确认对话框 */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除预设 <span className="font-mono font-semibold">{deletingPresetId}</span> 吗？
              此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={isDeleting}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "删除中..." : "删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
