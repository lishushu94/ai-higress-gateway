import Cookies from 'js-cookie';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export const tokenManager = {
  // Access Token - 同时存储在 localStorage 和 Cookie
  setAccessToken: (token: string) => {
    if (typeof window !== 'undefined') {
      // localStorage (客户端使用)
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
      
      // Cookie (middleware 使用)
      Cookies.set(ACCESS_TOKEN_KEY, token, {
        expires: 1/24, // 1小时 (1/24 天)
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });
    }
  },

  getAccessToken: (): string | null => {
    if (typeof window !== 'undefined') {
      // 优先从 localStorage 读取（更快）
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (token) return token;
      
      // 如果 localStorage 没有，尝试从 cookie 读取
      return Cookies.get(ACCESS_TOKEN_KEY) || null;
    }
    return null;
  },

  clearAccessToken: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      Cookies.remove(ACCESS_TOKEN_KEY);
    }
  },

  // Refresh Token - 仅存储在 Cookie
  setRefreshToken: (token: string) => {
    Cookies.set(REFRESH_TOKEN_KEY, token, {
      expires: 7, // 7天
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
  },

  getRefreshToken: (): string | undefined => {
    return Cookies.get(REFRESH_TOKEN_KEY);
  },

  clearRefreshToken: () => {
    Cookies.remove(REFRESH_TOKEN_KEY);
  },

  // 清除所有 token
  clearAll: () => {
    tokenManager.clearAccessToken();
    tokenManager.clearRefreshToken();
  },
};