'use client';

import { useEffect, useRef } from 'react';

/**
 * 全局光标辉光：柔和光晕跟随鼠标，仅精确指针设备启用。
 * 深色主题 screen 混合（提亮），浅色主题普通混合（暖色薄雾）。
 * 可通过 localStorage 'ez-glow'（'off' 关闭）+ 'ez-glow-change' 事件开关。
 */
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const el = ref.current;
    if (!el) return;

    const applyEnabled = () => {
      el.style.display = localStorage.getItem('ez-glow') === 'off' ? 'none' : '';
    };
    applyEnabled();
    window.addEventListener('ez-glow-change', applyEnabled);

    let raf = 0;
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 3;
    let x = tx;
    let y = ty;
    let visible = false;

    const loop = () => {
      x += (tx - x) * 0.12;
      y += (ty - y) * 0.12;
      el.style.transform = `translate3d(${x - 260}px, ${y - 260}px, 0)`;
      raf = requestAnimationFrame(loop);
    };

    const onMove = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!visible) {
        visible = true;
        el.style.opacity = '1';
      }
    };
    const onLeave = () => {
      visible = false;
      el.style.opacity = '0';
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', onMove);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('ez-glow-change', applyEnabled);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="cursor-glow pointer-events-none fixed left-0 top-0 z-[5] h-[520px] w-[520px] opacity-0 transition-opacity duration-500"
      style={{
        background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 60%)',
      }}
    />
  );
}
