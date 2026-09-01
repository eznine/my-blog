'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * 桌面端右侧滚动进度条（替代原生滚动条的外形）。
 * - 细轨悬浮于屏幕右缘内侧（不贴边、纵向留白）
 * - 橙色发光圆圈 = 当前阅读进度，随滚动上下移动
 * - 命中区 32px 宽（图形不变），点击/拖动容易命中
 * - 拖动时临时禁用页面 smooth 滚动，保证跳转跟手（否则每帧平滑动画追不上指针）
 * - 仅桌面端（xl+）显示；移动端保持原生滚动条
 */
export function ScrollProgressDot() {
  const railRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [pos, setPos] = useState(0); // 0..1
  const [visible, setVisible] = useState(false);

  /* 空闲时（非拖动）由滚动/尺寸变化驱动圆点位置 */
  useEffect(() => {
    const el = document.scrollingElement || document.documentElement;
    const update = () => {
      if (dragging.current) return;
      const max = el.scrollHeight - el.clientHeight;
      setPos(max > 0 ? el.scrollTop / max : 0);
      setVisible(el.scrollTop > 80);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  /** 按指针纵向位置定位：圆点立即跟随，页面立即跳转（无平滑动画） */
  const place = (clientY: number) => {
    const rail = railRef.current;
    if (!rail) return;
    const rect = rail.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    const el = document.scrollingElement || document.documentElement;
    setPos(ratio);
    el.scrollTop = ratio * (el.scrollHeight - el.clientHeight);
  };

  const beginDrag = () => {
    dragging.current = true;
    // 拖动期间关掉全局 smooth：直接赋值 scrollTop 才跟手
    document.documentElement.style.scrollBehavior = 'auto';
  };
  const endDrag = () => {
    dragging.current = false;
    document.documentElement.style.scrollBehavior = '';
  };

  return (
    <div
      ref={railRef}
      role="scrollbar"
      aria-orientation="vertical"
      aria-valuenow={Math.round(pos * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        beginDrag();
        place(e.clientY);
      }}
      onPointerMove={(e) => {
        if (dragging.current) place(e.clientY);
      }}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={`group fixed right-2 z-30 hidden w-8 cursor-pointer touch-none rounded-full transition-opacity duration-300 select-none xl:block ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ top: '22vh', bottom: '22vh' }}
    >
      {/* 细轨（3px → hover 5px 加亮；过渡只作用于尺寸/颜色，不加 top） */}
      <div className="pointer-events-none absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 rounded-full bg-line/60 transition-[width,background-color] duration-300 group-hover:w-[5px] group-hover:bg-line-strong" />
      {/* 橙色圆圈进度（hover 放大 + 光晕 + 外圈光环；位置 top 不受过渡影响，拖动即时跟随） */}
      <div
        className="pointer-events-none absolute left-1/2 h-3 w-3 rounded-full bg-accent shadow-[0_0_10px_rgba(255,75,51,0.55)] transition-[width,height,box-shadow] duration-300 group-hover:h-4 group-hover:w-4 group-hover:shadow-[0_0_18px_rgba(255,75,51,0.85)] group-hover:ring-4 group-hover:ring-accent/15"
        style={{ top: `${pos * 100}%`, transform: 'translate(-50%, -50%)' }}
      />
    </div>
  );
}