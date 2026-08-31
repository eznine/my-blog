'use client';

import { useEffect, useRef } from 'react';

/**
 * 卡片火花：悬停时在卡片内部浮现的细小粒子与连线。
 * 仅当父级 .explore-card 被悬停时运行动画循环。
 */
export function SparkField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const host = canvas.closest('.explore-card');
    if (!host) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;
    let t = 0;
    let hovered = false;
    let ink = '#ece5d1';
    let accent = '#ff4b33';

    const rgba = (hex: string, a: number) => {
      const h = hex.replace('#', '');
      if (h.length !== 6) return hex;
      return `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, ${a})`;
    };

    interface P {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      red: boolean;
    }
    let pts: P[] = [];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width * dpr);
      canvas.height = Math.max(1, rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.max(10, Math.round((rect.width * rect.height) / 5200));
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: 0.7 + Math.random() * 1.4,
        red: Math.random() < 0.14,
      }));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const readColors = () => {
      const s = getComputedStyle(document.documentElement);
      ink = s.getPropertyValue('--ink').trim() || ink;
      accent = s.getPropertyValue('--accent').trim() || accent;
    };
    readColors();

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      for (const p of pts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.fillStyle = p.red ? rgba(accent, 0.75) : rgba(ink, 0.3);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.lineWidth = 0.6;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 3600) {
            ctx.strokeStyle = rgba(ink, (1 - d2 / 3600) * 0.13);
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
      }
    };

    const loop = () => {
      if (!hovered) return;
      t += 0.016;
      draw();
      raf = requestAnimationFrame(loop);
    };

    const onEnter = () => {
      if (reduced) return;
      hovered = true;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    };
    const onLeave = () => {
      hovered = false;
      cancelAnimationFrame(raf);
    };

    if (reduced) {
      // 静态一帧
      requestAnimationFrame(draw);
    }

    host.addEventListener('mouseenter', onEnter);
    host.addEventListener('mouseleave', onLeave);

    return () => {
      host.removeEventListener('mouseenter', onEnter);
      host.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="sparks h-full w-full" aria-hidden="true" />;
}
