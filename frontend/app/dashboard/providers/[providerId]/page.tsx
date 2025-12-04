"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { providerService, Provider, Model, HealthStatus, ProviderMetrics } from "@/http/provider";

export default function ProviderDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useI18n();
    const providerId = params.providerId as string;

    const [provider, setProvider] = useState<Provider | null>(null);
    const [models, setModels] = useState<Model[]>([]);
    const [health, setHealth] = useState<HealthStatus | null>(null);
    const [metrics, setMetrics] = useState<ProviderMetrics[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // In a real app, we would handle errors for each call individually
                // For now, we wrap them all to ensure we get at least some data if possible, 
                // but Promise.all will fail if any fails. 
                // Better to use allSettled or individual try-catch, but for simplicity:
                const p = await providerService.getProvider(providerId);
                setProvider(p);

                try {
                    const m = await providerService.getProviderModels(providerId);
                    setModels(m.models);
                } catch (e) {
                    console.error("Failed to fetch models", e);
                }

                try {
                    const h = await providerService.checkProviderHealth(providerId);
                    setHealth(h);
                } catch (e) {
                    console.error("Failed to check health", e);
                }

                try {
                    const met = await providerService.getProviderMetrics(providerId);
                    setMetrics(met.metrics);
                } catch (e) {
                    console.error("Failed to fetch metrics", e);
                }

            } catch (error) {
                console.error("Failed to fetch provider details", error);
            } finally {
                setLoading(false);
            }
        };
        if (providerId) {
            fetchData();
        }
    }, [providerId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="text-muted-foreground animate-pulse">Loading provider details...</div>
            </div>
        );
    }

    if (!provider) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
                <div className="text-xl font-semibold">Provider not found</div>
                <Button onClick={() => router.back()}>Go Back</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{provider.name}</h1>
                        <div className="flex items-center gap-2 text-muted-foreground mt-1">
                            <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">{provider.id}</span>
                            <span>•</span>
                            <span className="text-sm capitalize">{provider.provider_type}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Status Badge */}
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${health?.status === 'healthy' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' :
                        health?.status === 'degraded' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800' :
                            'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                        }`}>
                        {health?.status === 'healthy' ? <CheckCircle className="w-4 h-4" /> :
                            health?.status === 'degraded' ? <AlertCircle className="w-4 h-4" /> :
                                <XCircle className="w-4 h-4" />}
                        <span className="text-sm font-medium capitalize">{health?.status || 'Unknown'}</span>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="models">Models ({models.length})</TabsTrigger>
                    <TabsTrigger value="keys">API Keys</TabsTrigger>
                    <TabsTrigger value="metrics">Metrics</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests (1m)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {metrics.reduce((acc, curr) => acc + curr.total_requests, 0)}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Latency</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {metrics.length > 0 ? (metrics.reduce((acc, curr) => acc + curr.avg_latency_ms, 0) / metrics.length).toFixed(0) : 0} ms
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Error Rate</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {metrics.length > 0 ? ((metrics.reduce((acc, curr) => acc + (curr.total_failures / curr.total_requests || 0), 0) / metrics.length) * 100).toFixed(2) : 0}%
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Configuration</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <div className="text-sm font-medium text-muted-foreground">Base URL</div>
                                <div className="font-mono text-sm p-2 bg-muted rounded">{provider.base_url}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-sm font-medium text-muted-foreground">Transport</div>
                                <div className="capitalize p-2">{provider.transport}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-sm font-medium text-muted-foreground">Models Path</div>
                                <div className="font-mono text-sm p-2 bg-muted rounded">{provider.models_path}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-sm font-medium text-muted-foreground">Messages Path</div>
                                <div className="font-mono text-sm p-2 bg-muted rounded">{provider.messages_path}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-sm font-medium text-muted-foreground">Region</div>
                                <div className="text-sm p-2">{provider.region || '-'}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-sm font-medium text-muted-foreground">Max QPS</div>
                                <div className="text-sm p-2">{provider.max_qps}</div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="models">
                    <Card>
                        <CardHeader>
                            <CardTitle>Supported Models</CardTitle>
                            <CardDescription>List of models available from this provider.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {models.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">No models found</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {models.map((model) => (
                                        <div key={model.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                            <div className="font-medium">{model.id}</div>
                                            <div className="text-xs text-muted-foreground mt-1">Owned by: {model.owned_by}</div>
                                            <div className="text-xs text-muted-foreground mt-1">Created: {new Date(model.created * 1000).toLocaleDateString()}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="keys">
                    <Card>
                        <CardHeader>
                            <CardTitle>API Keys</CardTitle>
                            <CardDescription>Manage API keys for this provider.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {provider.api_keys && provider.api_keys.length > 0 ? (
                                <div className="space-y-4">
                                    {provider.api_keys.map((key, index) => (
                                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                                            <div>
                                                <div className="font-medium">{key.label || 'Unnamed Key'}</div>
                                                <div className="text-xs text-muted-foreground mt-1">Weight: {key.weight}</div>
                                            </div>
                                            <div className="text-sm font-mono bg-muted px-2 py-1 rounded">
                                                {key.key.substring(0, 8)}...
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground py-8 text-center">
                                    No API keys configured.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="metrics">
                    <Card>
                        <CardHeader>
                            <CardTitle>Detailed Metrics</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {metrics.length > 0 ? (
                                <div className="space-y-4">
                                    {metrics.map((metric, index) => (
                                        <div key={index} className="p-4 border rounded-lg">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="font-medium">{metric.logical_model}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    Last updated: {new Date(metric.window_start * 1000).toLocaleTimeString()}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                <div>
                                                    <div className="text-muted-foreground">Requests</div>
                                                    <div className="font-mono">{metric.total_requests}</div>
                                                </div>
                                                <div>
                                                    <div className="text-muted-foreground">Success Rate</div>
                                                    <div className="font-mono">{(metric.success_rate * 100).toFixed(1)}%</div>
                                                </div>
                                                <div>
                                                    <div className="text-muted-foreground">Avg Latency</div>
                                                    <div className="font-mono">{metric.avg_latency_ms.toFixed(0)}ms</div>
                                                </div>
                                                <div>
                                                    <div className="text-muted-foreground">P99 Latency</div>
                                                    <div className="font-mono">{metric.p99_latency_ms.toFixed(0)}ms</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground py-8 text-center">
                                    No metrics available.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
