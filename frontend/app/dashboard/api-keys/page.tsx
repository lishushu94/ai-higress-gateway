"use client";

import React, { useState } from "react";
import { ApiKeysTable } from "@/components/dashboard/api-keys/api-keys-table";
import { ApiKeyDialog } from "@/components/dashboard/api-keys/api-key-dialog";
import { TokenDisplayDialog } from "@/components/dashboard/api-keys/token-display-dialog";
import { useApiKeys } from "@/lib/swr/use-api-keys";
import type { ApiKey } from "@/lib/api-types";

export default function ApiKeysPage() {
    const { apiKeys, loading, deleteApiKey } = useApiKeys();
    
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
    const [selectedKey, setSelectedKey] = useState<ApiKey | undefined>();
    
    const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
    const [newToken, setNewToken] = useState<string>('');
    const [newKeyName, setNewKeyName] = useState<string>('');

    const handleCreate = () => {
        setDialogMode('create');
        setSelectedKey(undefined);
        setDialogOpen(true);
    };

    const handleEdit = (apiKey: ApiKey) => {
        setDialogMode('edit');
        setSelectedKey(apiKey);
        setDialogOpen(true);
    };

    const handleCreateSuccess = (apiKey: ApiKey) => {
        if (apiKey.token) {
            setNewToken(apiKey.token);
            setNewKeyName(apiKey.name);
            setTokenDialogOpen(true);
        }
        setDialogOpen(false);
    };

    return (
        <div className="space-y-6 max-w-7xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2">API Keys</h1>
                    <p className="text-muted-foreground">
                        管理您的 API 密钥和访问令牌
                    </p>
                </div>
            </div>

            <ApiKeysTable
                apiKeys={apiKeys}
                loading={loading}
                onEdit={handleEdit}
                onDelete={deleteApiKey}
                onCreate={handleCreate}
            />

            <ApiKeyDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                mode={dialogMode}
                apiKey={selectedKey}
                onSuccess={handleCreateSuccess}
            />

            <TokenDisplayDialog
                open={tokenDialogOpen}
                onOpenChange={setTokenDialogOpen}
                token={newToken}
                keyName={newKeyName}
            />
        </div>
    );
}
