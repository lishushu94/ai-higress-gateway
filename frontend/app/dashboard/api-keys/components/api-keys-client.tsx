"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ApiKeysTable } from "@/components/dashboard/api-keys/api-keys-table";
import { useApiKeys } from "@/lib/swr/use-api-keys";
import type { ApiKey } from "@/lib/api-types";

// 动态导入对话框组件，减少初始加载体积
const ApiKeyDialog = dynamic(
  () => import("@/components/dashboard/api-keys/api-key-dialog").then(mod => ({ default: mod.ApiKeyDialog })),
  {
    ssr: false
  }
);

const TokenDisplayDialog = dynamic(
  () => import("@/components/dashboard/api-keys/token-display-dialog").then(mod => ({ default: mod.TokenDisplayDialog })),
  {
    ssr: false
  }
);

export function ApiKeysClient() {
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
    <>
      <ApiKeysTable
        apiKeys={apiKeys}
        loading={loading}
        onEdit={handleEdit}
        onDelete={deleteApiKey}
        onCreate={handleCreate}
      />

      {dialogOpen && (
        <ApiKeyDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          mode={dialogMode}
          apiKey={selectedKey}
          onSuccess={handleCreateSuccess}
        />
      )}

      {tokenDialogOpen && (
        <TokenDisplayDialog
          open={tokenDialogOpen}
          onOpenChange={setTokenDialogOpen}
          token={newToken}
          keyName={newKeyName}
        />
      )}
    </>
  );
}
