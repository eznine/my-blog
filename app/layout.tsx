import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/theme-provider';
import { TopoShaderField } from '@/components/topo-shader-field';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { CursorGlow } from '@/components/cursor-glow';
import { site } from '@/lib/site';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: `${site.siteName} · ${site.name}的 GIS 空间站`,
    template: `%s · ${site.siteName}`,
  },
  description: site.bio,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="transition-colors duration-300">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <CursorGlow />
          {/* 全站固定等高线背景：所有页面、任意滚动位置可见，支持鼠标扰动 */}
          <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
            <TopoShaderField className="h-full w-full" />
          </div>
          {/* 全站文字暗纱：内容列后方压暗等高线，所有页面与首页一致的可读性 */}
          <div className="veil-layer pointer-events-none fixed inset-0 -z-10" aria-hidden="true" />
          <div className="relative flex min-h-screen flex-col">
            <SiteHeader siteName={site.siteName} />
            <main className="flex-1 pt-14">{children}</main>
            <SiteFooter />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
