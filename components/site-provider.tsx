'use client';

import { createContext, useContext } from 'react';
import type { SiteConfig } from '@/lib/site';
import { site as siteStatic } from '@/lib/site';

/**
 * 动态模式（方案 C）专用：把服务端动态读取的 site 配置下发给客户端组件。
 *
 * 背景：客户端组件直接 `import { site } from '@/lib/site'` 时，site 数据在
 * 构建期就被打包进 JS —— 后台修改 content/copy/*.json 后，无论怎么刷新页面，
 * 客户端组件里的文案都不会变（服务端 site-server.ts 读的是新文件，客户端拿的
 * 是旧快照）。这就是"后台改了前台死不更新"的根因。
 *
 * 解法：根布局（server component）里用 lib/site-server.ts 读最新配置，
 * 通过 <SiteProvider value={site}> 注入，客户端组件一律改用 useSite() 取，
 * 后台保存后 3 秒内存缓存过期，下一次页面请求就下发新文案。
 *
 * 注意：静态导出（方案 A / GitHub Pages）走 build 期快照，不经过 server
 * 动态读取 —— useSite() 里 fallback 到静态 import 的 siteStatic，保证
 * A/B 分支在没有 Provider 时也能编译通过、行为不退化。
 */
const SiteContext = createContext<SiteConfig | null>(null);

export function SiteProvider({
  value,
  children,
}: {
  value: SiteConfig;
  children: React.ReactNode;
}) {
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite(): SiteConfig {
  const ctx = useContext(SiteContext);
  return ctx ?? siteStatic;
}