import { SWRProvider } from "@/lib/swr/provider";
import { serverFetch } from "@/lib/swr/server-fetch";
import { MyProvidersPageClient } from "./components/my-providers-page-client";
import type { Provider } from "@/http/provider";

export const metadata = {
  title: "我的私有 Provider",
  description: "管理您的私有提供商与配额",
};

interface UserQuotaApiResponse {
  private_provider_limit: number;
  private_provider_count: number;
  is_unlimited: boolean;
}

/**
 * 私有 Provider 页面 - 服务端组件
 * 
 * 职责：
 * - 服务端预取私有 Provider 列表和配额信息
 * - 通过 SWR fallback 传递预取数据给客户端
 * - 避免客户端初始加载闪烁
 */
export default async function MyProvidersPage() {
  // 注意：服务端无法获取 userId（存储在客户端 auth store）
  // 但可以尝试从 cookies 中获取用户信息
  // 如果获取失败，客户端会重新请求
  
  // 尝试预取数据（可能失败，客户端会处理）
  const [providersData, quotaData] = await Promise.all([
    serverFetch<Provider[]>('/users/me/private-providers'),
    serverFetch<UserQuotaApiResponse>('/users/me/quota'),
  ]);

  // 构建 fallback keys
  // 注意：这里使用 /users/me 作为占位符
  // 客户端会使用实际的 userId，但如果 userId 匹配，fallback 会生效
  const fallback: Record<string, any> = {};
  
  if (providersData) {
    // 如果服务端成功获取数据，添加到 fallback
    // 客户端需要使用相同的 key 格式
    fallback['/users/me/private-providers'] = providersData;
  }
  
  if (quotaData) {
    fallback['/users/me/quota'] = quotaData;
  }

  return (
    <SWRProvider fallback={fallback}>
      <MyProvidersPageClient />
    </SWRProvider>
  );
}
