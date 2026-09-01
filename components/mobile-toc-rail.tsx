'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Heading } from '@/lib/md';
import { useActiveId } from './toc';

/**
 * 移动端右侧章节指示器：等长短横线（无外框）。
 * 手指在滑轨上纵向拖动：跟随手指实时高亮对应章节（文字浮出、横线变长橙色），
 * 抬手即平滑滚动到该章节。点击单条横线同样可跳转。
 * touch-action:none 让拖动不被浏览器滚动/长按菜单接管。
 * createPortal 到 body，避免被页面过渡动画的 transform 祖先破坏 fixed 定位。
 */
export function MobileTocRail({ headings }: { headings: Heading[] }) {
  const activeId = useActiveId(headings);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
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
    return Math.min(headings.length - 1, Math.round(ratio * (headings.length - 1)));
  };

  const rail = (
    <div
      ref={railRef}
      className="fixed right-3 top-1/2 z-30 flex -translate-y-1/2 touch-none flex-col items-end gap-3 select-none xl:hidden"
      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', touchAction: 'none' }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        const idx = pick(e.clientY);
        if (idx !== undefined) setDragIdx(idx);
      }}
      onPointerMove={(e) => {
        if (dragIdx === null) return;
        const idx = pick(e.clientY);
        if (idx !== undefined) setDragIdx(idx);
      }}
      onPointerUp={() => {
        if (dragIdx !== null) {
          scrollTo(headings[dragIdx].id);
          setDragIdx(null);
        }
      }}
      onPointerCancel={() => setDragIdx(null)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {headings.map((h, i) => {
        const isDrag = dragIdx === i;
        const isActive = activeId === h.id;
        const len = 18;
        return (
          <button
            key={h.id}
            type="button"
            onClick={() => scrollTo(h.id)}
            aria-label={h.text}
            className="relative flex h-4 w-12 items-center justify-end"
            style={{ touchAction: 'none' }}
          >
            <span
              className={`h-[3px] rounded-full transition-all duration-300 ${
                isActive || isDrag ? 'bg-accent' : 'bg-ink-faint'
              }`}
              style={{ width: isDrag ? len + 10 : len }}
            />
            {dragIdx !== null && (
              <span
                className={`pointer-events-none absolute max-w-[60vw] truncate whitespace-nowrap rounded-md bg-panel/90 px-2 py-0.5 text-[15px] shadow-[var(--shadow)] backdrop-blur transition-all duration-200 ${
                  isDrag ? 'right-11' : 'right-8'
                }`}
              >
                <span className={isDrag ? 'font-semibold text-accent' : 'text-ink-soft'}>{h.text}</span>
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