'use client';

import Link from 'next/link';
import { Fragment, useLayoutEffect, useRef } from 'react';
import { useSite } from './site-provider';
import type { SiteConfig } from '@/lib/site';
import { hasVisitedNonHome } from '@/lib/nav-state';
import { topoState } from './topo-shader-field';
import { MapParticleField } from './map-particle-field';
import { SparkField } from './spark-field';
import { Crosshair } from './crosshair';
import { Counter } from './counter';
import { HeroRouteMap, applyRouteProgress, type RoutePoint } from './hero-route-map';

/**
 * 滚动驱动的开场舞台：section 高 260vh，内部 sticky 全屏。
 * 滚动进度 p（0→1，双向可逆）驱动：
 *   - 全站等高线背景缩放 0.42 → 1.0（写入 topoState，由 layout 的固定画布渲染）
 *   - 文字分层浮现（data-hs="起始,结束" 窗口，带缓动）
 *   - SCROLL 提示随 p 淡出
 */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

interface Step {
  el: HTMLElement;
  start: number;
  end: number;
  fadeOnly: boolean;
}

export function HeroScroll({
  notes,
  research,
  projects,
  hero,
  coords,
  github,
  routePoints,
}: {
  notes: number;
  research: number;
  projects: number;
  hero?: SiteConfig['hero'];
  coords?: string;
  github?: string;
  routePoints?: RoutePoint[];
}) {
  const site = useSite();
  const stageRef = useRef<HTMLElement>(null);
  // 优先使用 server 传入的动态文案（改文案即见）；未传时回退编译期静态值
  const heroCfg = hero ?? site.hero;
  const coordsCfg = coords ?? site.coords;
  const githubCfg = github ?? site.github;

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const steps: Step[] = [];
    stage.querySelectorAll<HTMLElement>('[data-hs]').forEach((el) => {
      const [s, e] = (el.dataset.hs || '0,1').split(',').map(Number);
      steps.push({ el, start: s, end: e, fadeOnly: el.dataset.hsFade === '1' });
    });
    const hint = stage.querySelector<HTMLElement>('[data-hs-hint]');

    // 站内返回首页：直接定位到开场完成处（p=1），不再重播开场。
    // 持续钉住 1.2s：Next 路由切换会带 smooth 滚动把位置拉回顶部，期间反复归位，钉住期结束后恢复原滚动行为。
    const viewportEl = stage.querySelector<HTMLElement>('.hero-sticky-viewport');
    if (hasVisitedNonHome()) {
      const el = document.documentElement;
      const prevBehavior = el.style.scrollBehavior;
      el.style.scrollBehavior = 'auto';
      const targetY = () => {
        const vh = viewportEl?.offsetHeight || window.innerHeight;
        return Math.max(0, stage.getBoundingClientRect().top + window.scrollY + stage.offsetHeight - vh);
      };
      window.scrollTo(0, targetY());
      const until = performance.now() + 1200;
      const pin = () => {
        window.scrollTo(0, targetY());
        if (performance.now() < until) requestAnimationFrame(pin);
        else el.style.scrollBehavior = prevBehavior;
      };
      requestAnimationFrame(pin);
    }

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = stage.getBoundingClientRect();
      // 分母用 sticky 容器实际高度（内容超高时容器会生长），保证动画跑完才开始上滑
      const vh = viewportEl?.offsetHeight || window.innerHeight;
      const total = Math.max(1, stage.offsetHeight - vh);
      const p = clamp01(-rect.top / total);

      // 勘测路线：与 data-hs 文字同帧驱动（DOM 直写，双向可逆）
      applyRouteProgress(stage, p);

      const eased = easeOut(p);
      topoState.zoom = 0.42 + 0.58 * eased;
      topoState.boost = 0.35 + 0.65 * eased;

      for (const st of steps) {
        const local = clamp01((p - st.start) / Math.max(0.0001, st.end - st.start));
        const e = easeOut(local);
        st.el.style.opacity = String(e);
        if (!st.fadeOnly) st.el.style.transform = `translateY(${(1 - e) * 28}px)`;
      }
      if (hint) hint.style.opacity = String(clamp01(1 - p / 0.12));
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
      topoState.zoom = 1;
      topoState.boost = 0.26;
    };
  }, []);

  const [lat, lon] = coordsCfg.match(/(\d+\.\d+)/g)?.map(Number) ?? [37.74, 112.66];

  return (
    <section ref={stageRef} className="hero-scroll-section relative -mt-14 border-b border-line">
      <div className="hero-sticky-viewport sticky top-0 flex items-center pt-16 pb-24 md:pb-16">
        {/* 等高线背景由 layout 的全站固定层渲染（滚动驱动 topoState） */}

        {/* 粒子尘埃：随进度淡入 */}
        <div data-hs="0.30,0.60" data-hs-fade="1" className="absolute inset-0" style={{ opacity: 0 }}>
          <MapParticleField className="absolute inset-0 h-full w-full" />
        </div>

        <div className="map-grid map-grid-fade absolute inset-0 opacity-70" aria-hidden="true" />
        <Crosshair baseLat={lat} baseLon={lon} />

        {/* 勘测路线：随开场文字一起浮现、随滚动向下延伸（仅桌面 xl+，CSS 控制显隐） */}
        {routePoints && routePoints.length > 0 && <HeroRouteMap points={routePoints} copy={heroCfg.route} />}

        {/* 文字区暗色纱罩：随文字浮现淡入，把等高线从文字后面压下去 */}
        <div
          data-hs="0.06,0.42"
          data-hs-fade="1"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: 0,
            background:
              'radial-gradient(ellipse 68% 66% at 34% 52%, var(--bg) 0%, color-mix(in srgb, var(--bg) 88%, transparent) 44%, transparent 76%)',
          }}
        />

        <div className="relative mx-auto w-full max-w-6xl px-6">
          <div data-hs="0.05,0.22" className="mono-label flex flex-wrap items-center gap-4" style={{ opacity: 0 }}>
            <span className="flex items-center gap-2.5 rounded-full border border-accent/50 px-3.5 py-1.5 !text-accent">
              <span className="marker-dot is-live !h-[6px] !w-[6px]" />
              {heroCfg.badge}
            </span>
            <span className="hidden h-px w-20 bg-line md:block" />
            <span className="hidden md:inline">{heroCfg.mapLabel}</span>
          </div>

          <h1
            data-hs="0.12,0.36"
            className="hero-shadow mt-6 text-[2.9rem] leading-[1.08] font-black tracking-tight text-ink md:mt-10 md:text-[4.6rem]"
            style={{ opacity: 0 }}
          >
            {heroCfg.titleLines.map((line, i) => (
              <Fragment key={i}>
                {i > 0 && <br />}
                <span className="grad-text glow-text">{line}</span>
              </Fragment>
            ))}
          </h1>

          <p data-hs="0.32,0.52" className="hero-shadow mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft md:mt-8" style={{ opacity: 0 }}>
            {heroCfg.bio}
          </p>

          <div data-hs="0.48,0.64" className="mt-8 flex flex-wrap items-center gap-5 md:mt-11" style={{ opacity: 0 }}>
            <Link
              href="/notes"
              className="group relative overflow-hidden rounded-xl px-8 py-3.5 text-base font-semibold text-white transition-transform duration-300 hover:scale-[1.04] active:scale-95"
              style={{ background: 'var(--accent)' }}
            >
              <span className="relative z-10" style={{ textShadow: 'none' }}>
                {heroCfg.ctaNotes}
              </span>
              <span className="absolute inset-0 -translate-x-full bg-white/25 transition-transform duration-500 group-hover:translate-x-full" />
            </Link>
            <Link
              href="/projects"
              className="rounded-xl border border-line-strong px-7 py-3.5 text-base font-medium text-ink transition-all hover:border-accent hover:text-accent"
            >
              {heroCfg.ctaProjects}
            </Link>
            <a
              href={githubCfg}
              target="_blank"
              rel="noreferrer"
              className="text-base text-ink-faint transition-colors hover:text-accent"
            >
              {heroCfg.github}
            </a>
          </div>

          <div
            data-hs="0.64,0.84"
            className="mt-8 grid max-w-2xl grid-cols-3 gap-4 md:mt-10"
            style={{ opacity: 0 }}
          >
            {[
              {n: notes, ...heroCfg.stats[0]},
              { n: research, ...heroCfg.stats[1] },
              { n: projects, ...heroCfg.stats[2] },
            ].map((s) => (
              <Link key={s.label} href={s.href} className="explore-card group rounded-2xl px-6 py-6">
                <span className="corner" aria-hidden="true" />
                <SparkField />
                <div className="relative font-mono text-4xl font-extrabold text-accent md:text-5xl">
                  <Counter to={s.n} />
                </div>
                <div className="mono-label relative mt-2 !normal-case !tracking-[0.1em] transition-colors group-hover:!text-ink">
                  {s.label}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div
          data-hs-hint
          className="mono-label hero-hint absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-2.5 whitespace-nowrap"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6 animate-bounce text-accent" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 4v14m0 0 6-6m-6 6-6-6" />
          </svg>
          <span>{heroCfg.scrollHint}</span>
          <span>{heroCfg.scrollHintEn}</span>
          <span className="!text-accent">{coordsCfg}</span>
        </div>
      </div>
    </section>
  );
}
