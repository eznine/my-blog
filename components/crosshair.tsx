'use client';

import { useEffect, useRef } from 'react';

interface CrosshairProps {
  baseLat: number;
  baseLon: number;
}

/**
 * 制图十字丝：鼠标在容器内移动时显示正交细线与经纬度读数。
 * 仅在支持精确指针的设备上启用；所有更新走 rAF + 直接 DOM 写入，避免重渲染。
 */
export function Crosshair({ baseLat, baseLon }: CrosshairProps) {
  const vRef = useRef<HTMLDivElement>(null);
  const hRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduced) return;

    const v = vRef.current;
    const h = hRef.current;
    const dot = dotRef.current;
    const label = labelRef.current;
    if (!v || !h || !dot || !label) return;

    let raf = 0;
    let targetX = 0;
    let targetY = 0;

    const draw = (x: number, y: number, rect: DOMRect) => {
      v.style.transform = `translateX(${x}px)`;
      h.style.transform = `translateY(${y}px)`;
      dot.style.transform = `translate(${x - 4}px, ${y - 4}px)`;
      const lon = baseLon + (x / rect.width) * 0.24;
      const lat = baseLat - (y / rect.height) * 0.24;
      label.textContent = `${lat.toFixed(4)}°N · ${lon.toFixed(4)}°E`;
      const labelW = 150;
      label.style.transform =
        x + 18 + labelW > rect.width
          ? `translate(${x - labelW - 14}px, ${y + 12}px)`
          : `translate(${x + 18}px, ${y + 12}px)`;
    };

    const onMove = (e: MouseEvent) => {
      const rect = e.currentTarget instanceof HTMLElement ? e.currentTarget.getBoundingClientRect() : null;
      if (!rect) return;
      targetX = e.clientX - rect.left;
      targetY = e.clientY - rect.top;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        draw(targetX, targetY, rect);
      });
    };

    const onEnter = () => {
      v.style.opacity = '0.4';
      h.style.opacity = '0.4';
      dot.style.opacity = '1';
      label.style.opacity = '1';
    };

    const onLeave = () => {
      v.style.opacity = '0';
      h.style.opacity = '0';
      dot.style.opacity = '0';
      label.style.opacity = '0';
    };

    const host = v.parentElement!;
    host.addEventListener('mousemove', onMove);
    host.addEventListener('mouseenter', onEnter);
    host.addEventListener('mouseleave', onLeave);

    return () => {
      host.removeEventListener('mousemove', onMove);
      host.removeEventListener('mouseenter', onEnter);
      host.removeEventListener('mouseleave', onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [baseLat, baseLon]);

  return (
    <>
      <div
        ref={vRef}
        className="crosshair-line top-0 bottom-0 left-0 w-px"
        style={{ transitionProperty: 'opacity' }}
      />
      <div
        ref={hRef}
        className="crosshair-line left-0 right-0 top-0 h-px"
        style={{ transitionProperty: 'opacity' }}
      />
      <div
        ref={dotRef}
        className="crosshair-line left-0 top-0 h-2 w-2 rounded-full border border-accent"
        style={{ background: 'transparent' }}
      />
      <div
        ref={labelRef}
        className="crosshair-line mono-label left-0 top-0 whitespace-nowrap"
        style={{ background: 'transparent', color: 'var(--accent)', fontSize: '10px' }}
      />
    </>
  );
}
