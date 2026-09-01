import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/theme-provider';
import { TopoShaderField } from '@/components/topo-shader-field';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { CursorGlow } from '@/components/cursor-glow';
import { ScrollProgressDot } from '@/components/scroll-progress-dot';
import { site } from '@/lib/site';
import { buildAppearanceCss } from '@/lib/appearance';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: site.meta.title,
    template: site.meta.titleTemplate,
  },
  description: site.meta.description || site.bio,
};

const appearanceCss = buildAppearanceCss();

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="transition-colors duration-300">
        {/* 进入页面时禁用浏览器滚动位置恢复，避免水合前先闪现上次滚动位置的内容 */}
        <script
          id="ez-scroll-reset"
          dangerouslySetInnerHTML={{
            __html:
              "try{if('scrollRestoration' in history)history.scrollRestoration='manual';if(!window.location.hash)window.scrollTo(0,0);}catch(e){}",
          }}
        />
        {/* 外观配置（content/appearance.json）：覆盖字号与颜色变量 */}
        <style id="ez-appearance" dangerouslySetInnerHTML={{ __html: appearanceCss }} />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <CursorGlow />
          {/* 桌面端右侧滚动进度（细轨 + 橙色圆圈），仅 xl+ 显示 */}
          <ScrollProgressDot />
          {/* 全站固定等高线背景：所有页面、任意滚动位置可见，支持鼠标扰动 */}
          <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
            <TopoShaderField className="h-full w-full" />
          </div>
          {/* 全站文字暗纱：内容列后方压暗等高线，所有页面与首页一致的可读性 */}
          <div className="veil-layer pointer-events-none fixed inset-0 -z-10" aria-hidden="true" />
          {/* overflow-x-clip：裁掉入场动画(rv ±44px 位移)等造成的横向溢出，
              scrollWidth 不再超出视口 → 安卓浏览器不再出现横向滚动指示条/横滑。
              clip 不产生滚动容器，不影响内部 position:sticky */}
          <div className="relative flex min-h-svh flex-col overflow-x-clip">
            <SiteHeader siteName={site.siteName} />
            <main className="flex-1 pt-14">{children}</main>
            <SiteFooter />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
