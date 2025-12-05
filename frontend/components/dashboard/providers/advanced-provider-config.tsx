"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form";
import { JsonEditor } from "./json-editor";
import { NumberArrayEditor } from "./array-editor";
import { ApiStylesConfig } from "./api-styles-config";
import { ChevronDown, ChevronUp } from "lucide-react";

// 类型安全的FormField包装器
const SafeFormField = FormField as any;

interface AdvancedProviderConfigProps {
    form: any;
    isFieldOverridden: (fieldName: string) => boolean;
    markFieldAsOverridden: (fieldName: string) => void;
    showAdvanced: boolean;
    onToggleAdvanced: () => void;
}

export function AdvancedProviderConfig({
    form,
    isFieldOverridden,
    markFieldAsOverridden,
    showAdvanced,
    onToggleAdvanced
}: AdvancedProviderConfigProps) {

    return (
        <div className="space-y-3">
            <button
                type="button"
                className="flex w-full items-center justify-between rounded-md border border-dashed border-muted-foreground/40 bg-muted/40 px-4 py-3 text-left"
                onClick={onToggleAdvanced}
            >
                <span className="font-medium text-sm">高级配置</span>
                {showAdvanced ? (
                    <ChevronUp className="h-4 w-4" />
                ) : (
                    <ChevronDown className="h-4 w-4" />
                )}
            </button>

            {showAdvanced && (
                <div className="space-y-4 rounded-md border bg-muted/20 p-4">
                    {/* API 路径配置 */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium">API 路径</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <SafeFormField
                                control={form.control}
                                name="modelsPath"
                                render={({ field }: { field: any }) => (
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium">Models Path</label>
                                        <Input
                                            {...field}
                                            placeholder="/v1/models"
                                            className="text-sm"
                                            onChange={(e) => {
                                                field.onChange(e);
                                                markFieldAsOverridden("modelsPath");
                                            }}
                                        />
                                    </div>
                                )}
                            />

                            <SafeFormField
                                control={form.control}
                                name="chatCompletionsPath"
                                render={({ field }: { field: any }) => (
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium">Chat Completions Path</label>
                                        <Input
                                            {...field}
                                            placeholder="/v1/chat/completions"
                                            className="text-sm"
                                            onChange={(e) => {
                                                field.onChange(e);
                                                markFieldAsOverridden("chatCompletionsPath");
                                            }}
                                        />
                                    </div>
                                )}
                            />

                            <SafeFormField
                                control={form.control}
                                name="messagesPath"
                                render={({ field }: { field: any }) => (
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium">Messages Path（可选）</label>
                                        <Input
                                            {...field}
                                            placeholder="/v1/messages"
                                            className="text-sm"
                                            onChange={(e) => {
                                                field.onChange(e);
                                                markFieldAsOverridden("messagesPath");
                                            }}
                                        />
                                    </div>
                                )}
                            />

                            <SafeFormField
                                control={form.control}
                                name="responsesPath"
                                render={({ field }: { field: any }) => (
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium">Responses Path（可选）</label>
                                        <Input
                                            {...field}
                                            placeholder="/v1/responses"
                                            className="text-sm"
                                            onChange={(e) => {
                                                field.onChange(e);
                                                markFieldAsOverridden("responsesPath");
                                            }}
                                        />
                                    </div>
                                )}
                            />
                        </div>
                    </div>

                    {/* 路由配置 */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium">路由配置</h4>
                        <div className="grid grid-cols-3 gap-4">
                            <SafeFormField
                                control={form.control}
                                name="weight"
                                render={({ field }: { field: any }) => (
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium">权重</label>
                                        <Input
                                            {...field}
                                            type="number"
                                            step="0.1"
                                            placeholder="1.0"
                                            className="text-sm"
                                        />
                                    </div>
                                )}
                            />

                            <SafeFormField
                                control={form.control}
                                name="maxQps"
                                render={({ field }: { field: any }) => (
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium">Max QPS</label>
                                        <Input
                                            {...field}
                                            type="number"
                                            placeholder="50"
                                            className="text-sm"
                                        />
                                    </div>
                                )}
                            />

                            <SafeFormField
                                control={form.control}
                                name="region"
                                render={({ field }: { field: any }) => (
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium">Region</label>
                                        <Input
                                            {...field}
                                            placeholder="us-east-1"
                                            className="text-sm"
                                        />
                                    </div>
                                )}
                            />
                        </div>
                    </div>

                    {/* 成本配置 */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium">成本配置（可选）</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <SafeFormField
                                control={form.control}
                                name="costInput"
                                render={({ field }: { field: any }) => (
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium">输入成本（$/1M tokens）</label>
                                        <Input
                                            {...field}
                                            type="number"
                                            step="0.01"
                                            placeholder="0.50"
                                            className="text-sm"
                                        />
                                    </div>
                                )}
                            />

                            <SafeFormField
                                control={form.control}
                                name="costOutput"
                                render={({ field }: { field: any }) => (
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium">输出成本（$/1M tokens）</label>
                                        <Input
                                            {...field}
                                            type="number"
                                            step="0.01"
                                            placeholder="1.50"
                                            className="text-sm"
                                        />
                                    </div>
                                )}
                            />
                        </div>
                    </div>

                    {/* API 样式配置 */}
                    <ApiStylesConfig
                        form={form}
                        isFieldOverridden={isFieldOverridden}
                        markFieldAsOverridden={markFieldAsOverridden}
                    />

                    {/* 可重试状态码 */}
                    <SafeFormField
                        control={form.control}
                        name="retryableStatusCodes"
                        render={({ field }: { field: any }) => (
                            <NumberArrayEditor
                                label="可重试状态码"
                                value={field.value || []}
                                onChange={(value) => {
                                    field.onChange(value);
                                    markFieldAsOverridden("retryableStatusCodes");
                                }}
                                placeholder="例如：429, 500, 502"
                                description="遇到这些 HTTP 状态码时会自动重试"
                                min={100}
                                max={599}
                            />
                        )}
                    />

                    {/* 自定义请求头 */}
                    <SafeFormField
                        control={form.control}
                        name="customHeaders"
                        render={({ field }: { field: any }) => (
                            <JsonEditor
                                label="自定义请求头"
                                value={field.value}
                                onChange={(value) => {
                                    field.onChange(value);
                                    markFieldAsOverridden("customHeaders");
                                }}
                                placeholder='{"X-Custom-Header": "value"}'
                                description="添加到每个请求的自定义 HTTP 头"
                                rows={4}
                            />
                        )}
                    />

                    {/* 静态模型列表 */}
                    <SafeFormField
                        control={form.control}
                        name="staticModels"
                        render={({ field }: { field: any }) => (
                            <JsonEditor
                                label="静态模型列表"
                                value={field.value}
                                onChange={(value) => {
                                    field.onChange(value);
                                    markFieldAsOverridden("staticModels");
                                }}
                                placeholder='[{"id": "model-1", "name": "Model 1"}]'
                                description="当 Provider 不提供 /models 接口时使用"
                                rows={4}
                            />
                        )}
                    />
                </div>
            )}
        </div>
    );
}