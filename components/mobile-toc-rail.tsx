'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Heading } from '@/lib/md';
import { useActiveId } from './toc';

/**
 * 移动端右侧章节指示器：扇形短横线（无外框）。
 * 手指在横线上滑动时，每条横线浮出对应章节文字；划到的那条横线变长、文字橙色高亮，其余默认色。
 * 当前阅读章节的横线常驻橙色。仅 <xl 显示（xl+ 用左侧 DesktopToc）。
 * createPortal 到 body，避免被页面过渡动画的 transform 祖先破坏 fixed 定位。
 */
export function MobileTocRail({ headings }: { headings: Heading[] }) {
  const activeId = useActiveId(headings);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  if (headings.length === 0) return null;

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const pick = (clientY: number) => {
    const rail = railRef.current;
    if (!rail) return;
    const rect = rail.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    setHoverIdx(Math.min(headings.length - 1, Math.round(ratio * (headings.length - 1))));
  };

  const rail = (
    <div
      ref={railRef}
      className="fixed right-3 top-1/2 z-30 flex -translate-y-1/2 flex-col items-end gap-3 xl:hidden"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        pick(e.clientY);
      }}
      onPointerMove={(e) => pick(e.clientY)}
      onPointerUp={() => setHoverIdx(null)}
      onPointerLeave={() => setHoverIdx(null)}
    >
      {headings.map((h, i) => {
        const isHover = hoverIdx === i;
        const isActive = activeId === h.id;
        const len = 18;
        return (
          <button
            key={h.id}
            type="button"
            onClick={() => scrollTo(h.id)}
            aria-label={h.text}
            className="relative flex h-4 w-12 items-center justify-end"
          >
            <span
              className={`h-[3px] rounded-full transition-all duration-300 ${
                isActive || isHover ? 'bg-accent' : 'bg-ink-faint'
              }`}
              style={{ width: isHover ? len + 10 : len }}
            />
            {hoverIdx !== null && (
              <span
                className={`pointer-events-none absolute max-w-[60vw] truncate whitespace-nowrap rounded-md bg-panel/90 px-2 py-0.5 text-[15px] shadow-[var(--shadow)] backdrop-blur transition-all duration-200 ${
                  isHover ? 'right-11' : 'right-8'
                }`}
              >
                <span className={isHover ? 'font-semibold text-accent' : 'text-ink-soft'}>{h.text}</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  if (!mounted) return null;
  return createPortal(rail, document.body);
}
