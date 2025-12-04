"use client";

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    // 应用启动时检查认证状态
    checkAuth();
  }, [checkAuth]);

  return <>{children}</>;
}