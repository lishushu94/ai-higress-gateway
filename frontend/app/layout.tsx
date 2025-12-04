import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/lib/i18n-context";
import { AuthProvider } from "@/components/providers/auth-provider";
import { AuthDialog } from "@/components/auth/auth-dialog";
import { SWRProvider } from "@/lib/swr";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "AI Higress Frontend",
  description: "Frontend for AI Higress API Gateway",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <I18nProvider>
            <SWRProvider>
              <AuthProvider>
                {children}
                {/* 全局登录对话框 - 由 Zustand 状态控制显示 */}
                <AuthDialog />
              </AuthProvider>
            </SWRProvider>
          </I18nProvider>
          <Toaster richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
