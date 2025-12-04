"use client";

import React, { useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select } from "@/components/ui/select";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, ChevronDown, ChevronUp } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";

const VENDOR_VALUES = [
    "openai",
    "anthropic",
    "google-gemini",
    "azure-openai",
    "cohere",
    "custom",
] as const;

type VendorValue = typeof VENDOR_VALUES[number];

const VENDOR_LABEL_MAP: Record<VendorValue, string> = {
    "openai": "OpenAI",
    "anthropic": "Anthropic",
    "google-gemini": "Google Gemini",
    "azure-openai": "Azure OpenAI",
    "cohere": "Cohere",
    "custom": "自定义 / 其他",
};

const VENDOR_OPTIONS = VENDOR_VALUES.map((value) => ({
    value,
    label: VENDOR_LABEL_MAP[value],
}));

const providerFormSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(1, "Provider Name 不能为空")
            .max(100, "Provider Name 最长 100 个字符"),
        providerType: z.enum(["native", "aggregator"]),
        vendorPreset: z.enum(VENDOR_VALUES),
        customVendorName: z.string().trim().optional(),
        aggregatorName: z.string().trim().optional(),
        transport: z.enum(["http", "sdk"]),
        baseUrl: z.string().trim().optional(),
        messagesPath: z.string().trim().optional(),
        weight: z.string().trim().default("1"),
        maxQps: z.string().trim().optional(),
        region: z.string().trim().optional(),
    })
    .superRefine((values, ctx) => {
        if (values.providerType === "native") {
            if (values.vendorPreset === "custom") {
                if (!values.customVendorName?.trim()) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ["customVendorName"],
                        message: "请输入厂商名称",
                    });
                }
            }
        } else if (!values.aggregatorName?.trim()) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["aggregatorName"],
                message: "聚合平台名称不能为空",
            });
        }

        if (values.transport === "http") {
            if (!values.baseUrl?.trim()) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["baseUrl"],
                    message: "HTTP 模式必须填写 Base URL",
                });
            } else {
                try {
                    // eslint-disable-next-line no-new
                    new URL(values.baseUrl);
                } catch (_) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ["baseUrl"],
                        message: "请输入合法的 URL",
                    });
                }
            }
        }

        if (values.messagesPath && !values.messagesPath.startsWith("/")) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["messagesPath"],
                message: "路径应以 / 开头",
            });
        }

        const weightValue = Number(values.weight);
        if (!values.weight || Number.isNaN(weightValue) || weightValue <= 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["weight"],
                message: "请输入大于 0 的权重",
            });
        }

        if (values.maxQps) {
            const qpsValue = Number(values.maxQps);
            if (Number.isNaN(qpsValue) || qpsValue <= 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["maxQps"],
                    message: "Max QPS 需为大于 0 的数字",
                });
            }
        }
    });

type ProviderFormValues = z.infer<typeof providerFormSchema>;

export type ProviderFormSubmitPayload = {
    name: string;
    providerType: "native" | "aggregator";
    vendorName: string;
    transport: "http" | "sdk";
    baseUrl?: string;
    messagesPath?: string;
    weight: number;
    maxQps?: number;
    region?: string;
};

const providerFormDefaults: ProviderFormValues = {
    name: "",
    providerType: "native",
    vendorPreset: "openai",
    customVendorName: "",
    aggregatorName: "",
    transport: "http",
    baseUrl: "",
    messagesPath: "/v1/messages",
    weight: "1",
    maxQps: "",
    region: "",
};

interface ProviderFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit?: (payload: ProviderFormSubmitPayload) => void | Promise<void>;
}

export function ProviderForm({ open, onOpenChange, onSubmit }: ProviderFormProps) {
    const { t } = useI18n();
    const [showAdvanced, setShowAdvanced] = useState(false);

    const form = useForm<ProviderFormValues>({
        resolver: zodResolver(providerFormSchema),
        defaultValues: providerFormDefaults,
    });

    const providerType = form.watch("providerType");
    const transport = form.watch("transport");
    const vendorPreset = form.watch("vendorPreset");

    const isSdkTransport = transport === "sdk";
    const isCustomVendor = providerType === "native" && vendorPreset === "custom";

    const vendorOptions = useMemo(() => VENDOR_OPTIONS, []);

    const handleFormSubmit = async (values: ProviderFormValues) => {
        const vendorName = values.providerType === "native"
            ? values.vendorPreset === "custom"
                ? (values.customVendorName ?? "").trim()
                : vendorOptions.find((opt) => opt.value === values.vendorPreset)?.label ?? values.vendorPreset
            : (values.aggregatorName ?? "").trim();

        const payload: ProviderFormSubmitPayload = {
            name: values.name.trim(),
            providerType: values.providerType,
            vendorName,
            transport: values.transport,
            baseUrl: values.transport === "http" ? values.baseUrl?.trim() || undefined : undefined,
            messagesPath: !isSdkTransport ? values.messagesPath?.trim() || undefined : undefined,
            weight: Number(values.weight),
            maxQps: values.maxQps ? Number(values.maxQps) : undefined,
            region: values.region?.trim() || undefined,
        };

        if (onSubmit) {
            await onSubmit(payload);
        } else {
            // eslint-disable-next-line no-console
            console.log("[ProviderForm] submit payload", payload);
        }

        form.reset(providerFormDefaults);
        setShowAdvanced(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("providers.dialog_title")}</DialogTitle>
                    <DialogDescription>
                        {t("providers.dialog_description")}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 py-4">
                    {/* Basic configuration */}
                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem className="space-y-2">
                                    <div className="flex items-center gap-1 text-sm font-medium">
                                        <FormLabel className="text-sm">Provider Name</FormLabel>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="inline-flex h-4 w-4 items-center justify-center text-muted-foreground"
                                                >
                                                    <Info className="h-3 w-3" aria-hidden="true" />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                展示用名称，例如 “OpenAI（生产环境）”。
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                    <FormControl>
                                        <Input {...field} placeholder="例如：OpenAI" value={field.value} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {/* Provider Type & Transport - 主控制区，从高级设置中提到基础配置区域 */}
                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="providerType"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <div className="flex items-center gap-1 text-sm font-medium">
                                            <FormLabel className="text-sm">Provider Type</FormLabel>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className="inline-flex h-4 w-4 items-center justify-center text-muted-foreground"
                                                    >
                                                        <Info className="h-3 w-3" aria-hidden="true" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    标记是直连厂商（Native），还是通过聚合平台（Aggregator）转发。
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                        <Tabs
                                            value={field.value}
                                            onValueChange={(value) => field.onChange(value as "native" | "aggregator")}
                                        >
                                            <TabsList>
                                                <TabsTrigger value="native">直连（Native）</TabsTrigger>
                                                <TabsTrigger value="aggregator">聚合（Aggregator）</TabsTrigger>
                                            </TabsList>
                                        </Tabs>
                                        <FormDescription>
                                            当通过上游聚合平台转发时，请选择 Aggregator。
                                        </FormDescription>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="transport"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <div className="flex items-center gap-1 text-sm font-medium">
                                            <FormLabel className="text-sm">Transport</FormLabel>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className="inline-flex h-4 w-4 items-center justify-center text-muted-foreground"
                                                    >
                                                        <Info className="h-3 w-3" aria-hidden="true" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    选择使用 HTTP 代理还是官方 SDK。大多数场景推荐保持 HTTP。
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                        <FormControl>
                                            <Select
                                                value={field.value}
                                                onChange={(event) => field.onChange(event.target.value as "http" | "sdk")}
                                            >
                                                <option value="sdk">SDK</option>
                                                <option value="http">HTTP 代理</option>
                                            </Select>
                                        </FormControl>
                                        <FormDescription>
                                            选择 SDK 时使用系统预设，无需填写 Base URL；HTTP 模式需自定义上游地址。
                                        </FormDescription>
                                    </FormItem>
                                )}
                            />
                        </div>
                        {providerType === "native" ? (
                            <>
                                <FormField
                                    control={form.control}
                                    name="vendorPreset"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <div className="flex items-center gap-1 text-sm font-medium">
                                                <FormLabel className="text-sm">Vendor / Platform</FormLabel>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <button
                                                            type="button"
                                                            className="inline-flex h-4 w-4 items-center justify-center text-muted-foreground"
                                                        >
                                                            <Info className="h-3 w-3" aria-hidden="true" />
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        底层厂商或平台名称，例如 OpenAI、Anthropic、Google、Azure。
                                                    </TooltipContent>
                                                </Tooltip>
                                            </div>
                                            <FormControl>
                                                <Select
                                                    value={field.value}
                                                    onChange={(event) => field.onChange(event.target.value)}
                                                >
                                                    {vendorOptions.map((option) => (
                                                        <option key={option.value} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {isCustomVendor && (
                                    <FormField
                                        control={form.control}
                                        name="customVendorName"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder="请输入厂商名称，例如：Ollama"
                                                        value={field.value ?? ""}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </>
                        ) : (
                            <FormField
                                control={form.control}
                                name="aggregatorName"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <div className="flex items-center gap-1 text-sm font-medium">
                                            <FormLabel className="text-sm">Vendor / Platform</FormLabel>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className="inline-flex h-4 w-4 items-center justify-center text-muted-foreground"
                                                    >
                                                        <Info className="h-3 w-3" aria-hidden="true" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    底层聚合平台名称，例如 OneAPI、自建中台等。
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder="例如：OneAPI, 自建聚合服务"
                                                value={field.value ?? ""}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        {!isSdkTransport && (
                            <FormField
                                control={form.control}
                                name="baseUrl"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <div className="flex items-center gap-1 text-sm font-medium">
                                            <FormLabel className="text-sm">API Base URL</FormLabel>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className="inline-flex h-4 w-4 items-center justify-center text-muted-foreground"
                                                    >
                                                        <Info className="h-3 w-3" aria-hidden="true" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    上游接口的基础地址，例如 https://api.openai.com/v1。
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder="例如：https://api.openai.com/v1"
                                                value={field.value ?? ""}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                    </div>

                    {/* Advanced settings (collapsible) */}
                    <div className="space-y-2">
                        <button
                            type="button"
                            className="flex w-full items-center justify-between rounded-md border border-dashed border-muted-foreground/40 bg-muted/40 px-3 py-2 text-left text-sm"
                            onClick={() => setShowAdvanced((prev) => !prev)}
                        >
                            <span className="font-medium">
                                {t("providers.advanced_settings")}
                            </span>
                            {showAdvanced ? (
                                <ChevronUp className="h-4 w-4" />
                            ) : (
                                <ChevronDown className="h-4 w-4" />
                            )}
                        </button>
                        {showAdvanced && (
                            <div className="mt-3 space-y-4 rounded-md border bg-muted/40 p-4">
                                {!isSdkTransport && (
                                    <div className="grid grid-cols-1 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="messagesPath"
                                            render={({ field }) => (
                                                <FormItem className="space-y-2">
                                                    <div className="flex items-center gap-1 text-sm font-medium">
                                                        <FormLabel className="text-sm">Messages Path</FormLabel>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <button
                                                                    type="button"
                                                                    className="inline-flex h-4 w-4 items-center justify-center text-muted-foreground"
                                                                >
                                                                    <Info className="h-3 w-3" aria-hidden="true" />
                                                                </button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                Claude / Chat 接口首选路径，例如 /v1/messages 或 /v1/chat/completions。
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </div>
                                                    <FormControl>
                                                        <Input
                                                            {...field}
                                                            placeholder="/v1/messages"
                                                            value={field.value ?? ""}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                )}
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <FormField
                                        control={form.control}
                                        name="weight"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <div className="flex items-center gap-1 text-sm font-medium">
                                                    <FormLabel className="text-sm">Routing Weight</FormLabel>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button
                                                                type="button"
                                                                className="inline-flex h-4 w-4 items-center justify-center text-muted-foreground"
                                                            >
                                                                <Info className="h-3 w-3" aria-hidden="true" />
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            路由权重，数值越大，被选中的概率越高。默认 1.0。
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </div>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        step="0.1"
                                                        placeholder="例如：1.0"
                                                        value={field.value ?? ""}
                                                        onChange={(event) => field.onChange(event.target.value)}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="maxQps"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <div className="flex items-center gap-1 text-sm font-medium">
                                                    <FormLabel className="text-sm">Max QPS</FormLabel>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button
                                                                type="button"
                                                                className="inline-flex h-4 w-4 items-center justify-center text-muted-foreground"
                                                            >
                                                                <Info className="h-3 w-3" aria-hidden="true" />
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            Provider 级限流，达到该 QPS 后会暂时跳过该 Provider。
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </div>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        placeholder="例如：50"
                                                        value={field.value ?? ""}
                                                        onChange={(event) => field.onChange(event.target.value)}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="region"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <FormLabel className="text-sm">Region（可选）</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder="例如：us-east-1"
                                                        value={field.value ?? ""}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                        API Key 会在服务商详情页单独管理。创建服务商后，你可以在详情页中添加带权重的密钥。
                    </p>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                form.reset(providerFormDefaults);
                                setShowAdvanced(false);
                                onOpenChange(false);
                            }}
                        >
                            {t("providers.btn_cancel")}
                        </Button>
                        <Button type="submit">{t("providers.btn_create")}</Button>
                    </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
