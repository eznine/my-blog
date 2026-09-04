'use client';

import { useEffect } from 'react';

const RADIUS = 320;
const FULL_GLOW_DISTANCE = RADIUS * 0.35;
const FADE_DISTANCE = RADIUS;

/**
 * 卡片邻近光：指针进入带 data-glow-grid 的容器后，按鼠标到每张
 * .explore-card 边缘的距离写入 --glow-x/--glow-y/--glow-intensity，
 * CSS 用 masked radial-gradient 只点亮靠近鼠标的轮廓。
 */
export function CardProximityGlow() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!canHover || reducedMotion) return;

    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    let activeGrid: HTMLElement | null = null;

    const setIntensity = (card: HTMLElement, value: number) => {
      card.style.setProperty('--glow-intensity', String(value));
    };

    const clearGrid = (grid: HTMLElement | null) => {
      if (!grid) return;
      grid.querySelectorAll<HTMLElement>('.explore-card').forEach((card) => setIntensity(card, 0));
    };

    const update = () => {
      frame = 0;
      if (!activeGrid) return;

      activeGrid.querySelectorAll<HTMLElement>('.explore-card').forEach((card) => {
        const rect = card.getBoundingClientRect();
        if (
          rect.bottom < -RADIUS ||
          rect.top > window.innerHeight + RADIUS ||
          rect.right < -RADIUS ||
          rect.left > window.innerWidth + RADIUS
        ) {
          setIntensity(card, 0);
          return;
        }

        const dx = Math.max(rect.left - pointerX, 0, pointerX - rect.right);
        const dy = Math.max(rect.top - pointerY, 0, pointerY - rect.bottom);
        const distance = Math.hypot(dx, dy);

        let intensity = 0;
        if (distance <= FULL_GLOW_DISTANCE) intensity = 1;
        else if (distance < FADE_DISTANCE) intensity = (FADE_DISTANCE - distance) / (FADE_DISTANCE - FULL_GLOW_DISTANCE);

        const relativeX = ((pointerX - rect.left) / Math.max(rect.width, 1)) * 100;
        const relativeY = ((pointerY - rect.top) / Math.max(rect.height, 1)) * 100;

        card.style.setProperty('--glow-x', `${relativeX.toFixed(1)}%`);
        card.style.setProperty('--glow-y', `${relativeY.toFixed(1)}%`);
        card.style.setProperty('--glow-radius', `${RADIUS}px`);
        setIntensity(card, Number(intensity.toFixed(3)));
      });
    };

    const scheduleUpdate = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;

      pointerX = event.clientX;
      pointerY = event.clientY;

      const target = event.target instanceof Element ? event.target : null;
      const nextGrid = target?.closest<HTMLElement>('[data-glow-grid]') ?? null;
      if (nextGrid !== activeGrid) {
        clearGrid(activeGrid);
        activeGrid = nextGrid;
      }

      scheduleUpdate();
    };

    const handlePointerLeave = () => {
      clearGrid(activeGrid);
      activeGrid = null;
    };

    document.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('pointerleave', handlePointerLeave);
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      clearGrid(activeGrid);
    };
  }, []);

  return null;
}
