import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 需要认证的路由前缀
const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/system',
];

// 公开路由（不需要认证）
const publicRoutes = [
  '/login',
  '/register',
  '/',
];

// 检查路径是否需要认证
function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some(route => pathname.startsWith(route));
}

// 检查路径是否是公开路由
function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route => pathname === route || pathname.startsWith(route));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 从 cookie 获取 token
  const accessToken = request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;
  
  // 检查是否是受保护的路由
  if (isProtectedRoute(pathname)) {
    // 如果没有 token，重定向到登录页
    if (!accessToken && !refreshToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // 有 token，允许访问
    return NextResponse.next();
  }
  
  // 如果已登录用户访问登录页，重定向到 dashboard
  if (pathname === '/login' && accessToken) {
    return NextResponse.redirect(new URL('/dashboard/overview', request.url));
  }
  
  // 其他路由正常访问
  return NextResponse.next();
}

// 配置 middleware 匹配的路径
export const config = {
  matcher: [
    /*
     * 匹配所有路径除了：
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
};