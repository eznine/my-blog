'use client';

import { useState } from 'react';
import { asset } from '@/lib/site';

/**
 * GEE Playground 嵌入组件。
 * 客户端组件：用 @/lib/site 的 asset() 生成带 basePath 前缀的 demo iframe 地址
 * （GitHub Pages 子路径 /my-blog/demos/... 也能正确解析；eznine.xyz 根路径下一致）。
 * 纯前端演示，不需要后台服务；未登录也能打开（工具有自己的登录流程）。
 */

export interface GeeCopy {
  title: string;
  en: string;
  status: string;
  desc: string;
  open: string;
  expand: string;
  hint: string;
}

// 注意：Next 静态服务不做目录解析（dev 与 standalone 下 /demos/x/ 都 404），
// 必须显式指到 index.html（GH Pages/Nginx 才会自动补，见 AGENTS.md note-demo 同款教训）
const SRC = asset('/demos/gee-playground/index.html');

export function GeePlayground({ copy }: { copy: GeeCopy }) {
  const [opened, setOpened] = useState(false);

  return (
    <article className="explore-card relative flex h-full flex-col rounded-2xl p-6 md:p-7">
      <span className="corner" aria-hidden="true" />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 font-mono text-[12px] tracking-[0.14em]">
          <span className="marker-dot is-live" />
          <span className="text-accent">{copy.en}</span>
        </div>
        <span className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1 font-mono text-[11px] tracking-[0.12em] text-accent">
          {copy.status}
        </span>
      </div>

      <h2 className="relative mt-4 text-[1.5rem] font-bold leading-tight text-ink">{copy.title}</h2>
      <p className="relative mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-soft">{copy.desc}</p>

      <div className="relative mt-5 flex flex-wrap items-center gap-3">
        {!opened && (
          <button
            type="button"
            onClick={() => setOpened(true)}
            className="cursor-pointer rounded-lg bg-accent px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_0_24px_var(--accent-glow)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-strong"
          >
            {copy.expand}
          </button>
        )}
        <a
          href={SRC}
          target="_blank"
          rel="noreferrer"
          className="cursor-pointer rounded-lg border border-line px-5 py-2.5 text-[14px] font-medium text-ink-soft transition-colors hover:border-accent/60 hover:text-accent"
        >
          {copy.open}
        </a>
      </div>

      <p className="relative mt-4 text-[12.5px] leading-relaxed text-ink-faint">{copy.hint}</p>

      {opened && (
        <div className="relative mt-5">
          <div className="flex items-center justify-between border border-line bg-panel-solid px-4 py-2.5">
            <span className="font-mono text-[11px] tracking-[0.14em] text-ink-faint">
              {copy.en} · 全屏建议用「新窗口打开」（地图 / 编辑器 / 控制台同时操作需较宽视口）
            </span>
            <button
              type="button"
              onClick={() => setOpened(false)}
              className="cursor-pointer text-[13px] text-ink-soft transition-colors hover:text-accent"
            >
              收起 ▲
            </button>
          </div>
          <iframe
            src={SRC}
            title={copy.title}
            className="block h-[72vh] min-h-[560px] w-full border border-t-0 border-line bg-panel-solid"
          />
        </div>
      )}
    </article>
  );
}