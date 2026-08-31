'use client';

import { useEffect, useRef } from 'react';

interface Landmark {
  x: number;
  y: number;
  phase: number;
  label: string;
}

/**
 * 未完成的地图：经纬网十字刻度、漂移尘埃、星座连线与红色脉冲标记。
 * Canvas 渲染，页面不可见时暂停，尊重 reduced-motion（绘制静态帧）。
 */
export function MapParticleField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;
    let t = 0;
    let running = true;

    let ink = '#ece5d1';
    let accent = '#ff4b33';
    const readColors = () => {
      const s = getComputedStyle(document.documentElement);
      ink = s.getPropertyValue('--ink').trim() || ink;
      accent = s.getPropertyValue('--accent').trim() || accent;
    };
    readColors();

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
      depth: number;
    }
    let particles: P[] = [];
    let landmarks: Landmark[] = [];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width * dpr);
      canvas.height = Math.max(1, rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const w = rect.width;
      const h = rect.height;
      particles = Array.from({ length: Math.round((w * h) / 16000) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.16,
        r: 0.6 + Math.random() * 1.6,
        depth: 0.3 + Math.random() * 0.7,
      }));
      landmarks = [
        { x: w * 0.16, y: h * 0.68, phase: 0, label: 'PT·01' },
        { x: w * 0.82, y: h * 0.3, phase: 1.4, label: 'PT·02' },
        { x: w * 0.63, y: h * 0.78, phase: 2.7, label: 'PT·03' },
        { x: w * 0.3, y: h * 0.24, phase: 3.9, label: 'PT·04' },
      ];
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const GAP = 64;

    const drawGraticule = (w: number, h: number) => {
      ctx.lineWidth = 1;
      for (let gx = GAP / 2; gx < w; gx += GAP) {
        for (let gy = GAP / 2; gy < h; gy += GAP) {
          ctx.strokeStyle = rgba(ink, 0.16);
          ctx.beginPath();
          ctx.moveTo(gx - 7, gy);
          ctx.lineTo(gx + 7, gy);
          ctx.moveTo(gx, gy - 7);
          ctx.lineTo(gx, gy + 7);
          ctx.stroke();
        }
      }
      // 缓慢漂移的外框刻度
      ctx.strokeStyle = rgba(ink, 0.1);
      ctx.strokeRect(14, 14, w - 28, h - 28);
    };

    const drawParticles = (w: number, h: number) => {
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
        ctx.fillStyle = rgba(ink, 0.28 * p.depth + 0.08);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      // 星座连线
      ctx.lineWidth = 0.7;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 7300) {
            const alpha = (1 - d2 / 7300) * 0.14;
            ctx.strokeStyle = rgba(ink, alpha);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
    };

    const drawLandmarks = () => {
      for (const lm of landmarks) {
        const cycle = (t * 0.45 + lm.phase) % 2.2;
        // 扩散环
        if (cycle < 1.6) {
          const p = cycle / 1.6;
          ctx.strokeStyle = rgba(accent, (1 - p) * 0.5);
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(lm.x, lm.y, 6 + p * 30, 0, Math.PI * 2);
          ctx.stroke();
        }
        // 红点
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(lm.x, lm.y, 3.2, 0, Math.PI * 2);
        ctx.fill();
        // 十字
        ctx.strokeStyle = rgba(accent, 0.5);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lm.x - 14, lm.y);
        ctx.lineTo(lm.x - 8, lm.y);
        ctx.moveTo(lm.x + 8, lm.y);
        ctx.lineTo(lm.x + 14, lm.y);
        ctx.moveTo(lm.x, lm.y - 14);
        ctx.lineTo(lm.x, lm.y - 8);
        ctx.moveTo(lm.x, lm.y + 8);
        ctx.lineTo(lm.x, lm.y + 14);
        ctx.stroke();
        // 标注
        ctx.font = '10px ui-monospace, Consolas, monospace';
        ctx.fillStyle = rgba(accent, 0.75);
        ctx.fillText(lm.label, lm.x + 12, lm.y - 10);
      }
    };

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      drawGraticule(w, h);
      drawParticles(w, h);
      drawLandmarks();
    };

    const loop = () => {
      if (!running) return;
      t += 0.016;
      draw();
      raf = requestAnimationFrame(loop);
    };

    if (reduced) {
      draw();
    } else {
      raf = requestAnimationFrame(loop);
    }

    const onVis = () => {
      running = !document.hidden;
      if (running && !reduced) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(loop);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    const mo = new MutationObserver(readColors);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
