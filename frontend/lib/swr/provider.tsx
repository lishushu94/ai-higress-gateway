"use client";

import React, { createContext, useContext } from 'react';
import { SWRConfig, SWRConfiguration } from 'swr';
import { swrFetcher } from './fetcher';

// SWR 配置接口
export interface SWRProviderConfig extends SWRConfiguration {
  fetcher?: (url: string) => Promise<any>;
}

// 默认 SWR 配置
const defaultSWRConfig: SWRProviderConfig = {
  fetcher: swrFetcher.get,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 2000,
  focusThrottleInterval: 5000,
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  loadingTimeout: 10000,
  refreshInterval: 0, // 默认不自动刷新
  // 缓存策略配置
  keepPreviousData: true,
  // 错误处理
  onError: (error, key) => {
    console.error(`SWR Error for key ${key}:`, error);
  },
  // 成功回调
  onSuccess: (data, key) => {
    console.debug(`SWR Success for key ${key}:`, data);
  },
};

// SWR Provider 上下文
export const SWRProviderContext = createContext<SWRConfiguration>(defaultSWRConfig);

// SWR Provider 组件
interface SWRProviderProps {
  children: React.ReactNode;
  config?: SWRProviderConfig;
}

export const SWRProvider: React.FC<SWRProviderProps> = ({ 
  children, 
  config = {} 
}) => {
  // 合并默认配置和自定义配置
  const mergedConfig = {
    ...defaultSWRConfig,
    ...config,
    // 确保始终有 fetcher
    fetcher: config.fetcher || defaultSWRConfig.fetcher,
  };

  return (
    <SWRProviderContext.Provider value={mergedConfig}>
      <SWRConfig value={mergedConfig}>
        {children}
      </SWRConfig>
    </SWRProviderContext.Provider>
  );
};

// Hook 来获取 SWR 配置
export const useSWRConfig = () => {
  const context = useContext(SWRProviderContext);
  if (!context) {
    throw new Error('useSWRConfig must be used within a SWRProvider');
  }
  return context;
};

// 针对不同请求类型的特定 fetcher
export const createSWRHook = (method: keyof typeof swrFetcher) => {
  return (url: string, params?: any) => {
    if (method === 'getWithParams' && params) {
      return swrFetcher[method](url, params);
    }
    return swrFetcher[method as 'get'](url);
  };
};

// 预定义的 fetcher hooks
export const useGet = createSWRHook('get');
export const useGetWithParams = createSWRHook('getWithParams');
export const usePost = createSWRHook('post');
export const usePut = createSWRHook('put');
export const useDelete = createSWRHook('delete');
export const usePatch = createSWRHook('patch');