import { create } from 'zustand';
import { authService, type UserInfo, type LoginRequest, type RegisterRequest } from '@/http/auth';
import { tokenManager } from '@/lib/auth/token-manager';
import { toast } from 'sonner';

interface AuthState {
  user: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthDialogOpen: boolean;
  
  // Actions
  setUser: (user: UserInfo | null) => void;
  setLoading: (loading: boolean) => void;
  openAuthDialog: () => void;
  closeAuthDialog: () => void;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<UserInfo>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isAuthDialogOpen: false,

  setUser: (user) => {
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false
    });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  openAuthDialog: () => {
    set({ isAuthDialogOpen: true });
  },

  closeAuthDialog: () => {
    set({ isAuthDialogOpen: false });
  },

  login: async (credentials) => {
    try {
      set({ isLoading: true });
      
      // 调用登录 API
      const response = await authService.login(credentials);
      
      // 存储 tokens（同时存储到 localStorage 和 Cookie）
      tokenManager.setAccessToken(response.access_token);
      tokenManager.setRefreshToken(response.refresh_token);
      
      // 获取用户信息
      const user = await authService.getCurrentUser();
      
      // 更新状态
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        isAuthDialogOpen: false  // 登录成功后关闭对话框
      });
      
      toast.success('登录成功');
    } catch (error: any) {
      set({ isLoading: false });
      const message = error.response?.data?.detail || '登录失败';
      toast.error(message);
      throw error;
    }
  },

  register: async (data) => {
    try {
      set({ isLoading: true });
      
      // 调用注册 API
      const user = await authService.register(data);
      
      // 注册成功后自动登录
      await get().login({
        email: data.email,
        password: data.password,
      });
      
      toast.success('注册成功');
      return user;
    } catch (error: any) {
      set({ isLoading: false });
      const message = error.response?.data?.detail || '注册失败';
      toast.error(message);
      throw error;
    }
  },

  logout: async () => {
    try {
      // 调用登出 API
      await authService.logout();
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // 无论 API 是否成功，都清除本地状态
      tokenManager.clearAll();
      set({ 
        user: null, 
        isAuthenticated: false,
        isLoading: false 
      });
      toast.success('已退出登录');
    }
  },

  checkAuth: async () => {
    const accessToken = tokenManager.getAccessToken();
    
    if (!accessToken) {
      set({ 
        user: null, 
        isAuthenticated: false,
        isLoading: false 
      });
      return;
    }

    try {
      // 验证 token 并获取用户信息
      const user = await authService.getCurrentUser();
      set({ 
        user, 
        isAuthenticated: true,
        isLoading: false 
      });
    } catch (error) {
      // Token 无效，清除
      tokenManager.clearAll();
      set({ 
        user: null, 
        isAuthenticated: false,
        isLoading: false 
      });
    }
  },
}));