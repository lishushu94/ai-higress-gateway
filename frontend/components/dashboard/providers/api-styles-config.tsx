"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { FormField } from "@/components/ui/form";

// 类型安全的FormField包装器
const SafeFormField = FormField as any;

interface ApiStylesConfigProps {
    form: any;
    isFieldOverridden: (fieldName: string) => boolean;
    markFieldAsOverridden: (fieldName: string) => void;
}

export function ApiStylesConfig({
    form,
    isFieldOverridden,
    markFieldAsOverridden
}: ApiStylesConfigProps) {
    return (
        <SafeFormField
            control={form.control}
            name="supportedApiStyles"
            render={({ field }: { field: any }) => (
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">支持的 API 样式</label>
                        {isFieldOverridden("supportedApiStyles") && (
                            <Badge variant="outline" className="text-xs">
                                已覆盖
                            </Badge>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-4 pt-2">
                        {["openai", "responses", "claude"].map((style) => (
                            <div key={style} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`style-${style}`}
                                    checked={field.value?.includes(style) || false}
                                    onCheckedChange={(checked) => {
                                        const currentValue = field.value || [];
                                        const newValue = checked
                                            ? [...currentValue, style]
                                            : currentValue.filter((s: string) => s !== style);
                                        field.onChange(newValue);
                                        markFieldAsOverridden("supportedApiStyles");
                                    }}
                                />
                                <label
                                    htmlFor={`style-${style}`}
                                    className="text-sm font-normal cursor-pointer"
                                >
                                    {style}
                                </label>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        选择 Provider 支持的 API 格式
                    </p>
                </div>
            )}
        />
    );
}