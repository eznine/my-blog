'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/** 右侧演示栏挂载点（portal 到 document.body，避免 transform 祖先破坏 fixed） */
export const DEMO_SIDEBAR_ID = 'note-demo-sidebar';
/** 文章页最外层容器：打开演示模式时挂 data-demo="open"，CSS 据此隐藏目录 / 放宽宽度 */
export const DEMO_PAGE_ID = 'demo-page';

export interface DemoSpec {
  src: string;
  label?: string;
  height?: number;
}

/**
 * 笔记演示入口：标题右侧「运行 DEMO」→ 进入演示模式。
 * 演示栏 portal 到 document.body 并 position:fixed（桌面右半屏 50%，<768px 全屏），
 * 永不跟随页面滚动；左侧文章独立滚动。再点「关闭 DEMO」还原。
 * iframe 首次打开才挂载 src（关闭再开重新加载，状态重置）。
 */
export function NoteDemo({ demo }: { demo: DemoSpec }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setBody(document.body);
  }, []);

  // 演示模式：给最外层容器挂 data-demo，CSS 负责隐藏目录 / 正文留白
  useEffect(() => {
    const page = document.getElementById(DEMO_PAGE_ID);
    if (page) page.dataset.demo = open ? 'open' : '';
  }, [open]);

  const label = demo.label || 'DEMO';

  return (
    <>
      {/* 标题右侧开关按钮：明显 CTA + 强呼吸圆点 */}
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="demo-toggle">
        <span className="demo-live-dot" aria-hidden="true" />
        {open ? '关闭 DEMO' : '运行 DEMO'}
      </button>

      {/* 演示栏：portal 到 body（避开 page-enter 的 transform 祖先，保证 fixed 生效），桌面右半 50% / 手机全屏 */}
      {open &&
        body &&
        createPortal(
          <div id={DEMO_SIDEBAR_ID} className="demo-frame-wrap">
            <div className="demo-frame-bar">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="demo-frame-bar-dot" aria-hidden="true" />
                <span className="truncate font-mono text-[13px] font-bold tracking-[0.16em] text-accent">
                  {label}
                </span>
              </div>
              <div className="flex flex-none items-center gap-2.5">
                <a
                  href={demo.src}
                  target="_blank"
                  rel="noreferrer"
                  className="demo-frame-bar-btn"
                >
                  新窗口打开 ↗
                </a>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="demo-frame-bar-btn"
                >
                  ✕ 关闭
                </button>
              </div>
            </div>
            <iframe
              title={label}
              src={demo.src}
              className="demo-frame block w-full border-0 bg-white"
              loading="lazy"
            />
          </div>,
          body
        )}
    </>
  );
}