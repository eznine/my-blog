'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ThemeToggle } from './theme-toggle';
import { BrandLogo } from './brand-logo';
import { markVisitedNonHome } from '@/lib/nav-state';
import { site } from '@/lib/site';

const NAV = site.nav;

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 19V5m0 0-6 6m6-6 6 6" />
    </svg>
  );
}

export function SiteHeader({ siteName }: { siteName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // 水合前隐藏，避免导航栏闪现
  const [mounted, setMounted] = useState(false);
  // 首页开场（等高线背景阶段）未完成时隐藏导航栏
  const [intro, setIntro] = useState(pathname === '/');
  // 移动端滚动方向：下滑收起 / 上滑显示（仅移动端生效）
  const [hidden, setHidden] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 磁吸动效：光标附近的导航项（含搜索/主题按钮）放大上浮（Dock 式高斯衰减）
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const magRaf = useRef(0);
  const lastX = useRef<number | null>(null);

  const applyMag = () => {
    magRaf.current = 0;
    const mx = lastX.current;
    for (const el of itemRefs.current) {
      if (!el) continue;
      if (mx === null) {
        el.style.transform = '';
        continue;
      }
      const r = el.getBoundingClientRect();
      const d = mx - (r.left + r.width / 2);
      const g = Math.exp(-(d * d) / 9800); // σ ≈ 70px
      el.style.transform = `translateY(${(-3.5 * g).toFixed(2)}px) scale(${(1 + 0.13 * g).toFixed(3)})`;
    }
  };
  const onNavMove = (e: React.MouseEvent) => {
    lastX.current = e.clientX;
    if (!magRaf.current) magRaf.current = requestAnimationFrame(applyMag);
  };
  const onNavLeave = () => {
    lastX.current = null;
    if (!magRaf.current) magRaf.current = requestAnimationFrame(applyMag);
  };
  useEffect(
    () => () => {
      if (magRaf.current) cancelAnimationFrame(magRaf.current);
    },
    []
  );

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  // 记录站内已访问过非首页 → 返回首页时跳过开场动画
  useEffect(() => {
    if (pathname !== '/') markVisitedNonHome();
  }, [pathname]);

  useEffect(() => setMounted(true), []);

  // 移动端判断（<768px，对应 Tailwind md 断点）
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // 首页开场进度：p < 0.15（等高线背景阶段）隐藏导航栏，开场完成后显示
  useEffect(() => {
    if (pathname !== '/') {
      setIntro(false);
      return;
    }
    const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
    const update = () => {
      const hero = document.querySelector<HTMLElement>('.hero-scroll-section');
      if (!hero) {
        setIntro(false);
        return;
      }
      const rect = hero.getBoundingClientRect();
      // 与 hero-scroll.tsx 一致：分母用 sticky 容器实际高度（视口高度）
      const viewport = hero.querySelector<HTMLElement>('.hero-sticky-viewport');
      const vh = viewport?.offsetHeight || window.innerHeight;
      const total = Math.max(1, hero.offsetHeight - vh);
      const p = clamp01(-rect.top / total);
      setIntro(p < 0.15);
    };
    const onScroll = () => requestAnimationFrame(update);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', update);
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', update);
    };
  }, [pathname]);

  // 滚动方向控制（仅移动端）：下滑收起，上滑显示；顶部始终显示
  useEffect(() => {
    if (!isMobile) {
      setHidden(false);
      return;
    }
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastY;
        if (y < 120) setHidden(false);
        else if (delta > 6) setHidden(true);
        else if (delta < -6) setHidden(false);
        lastY = y;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isMobile]);

  // 回到顶部按钮显示（所有端）：滚动超过阈值后出现
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setShowTop(window.scrollY > 480);
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // 移动端菜单展开时强制显示导航栏
  useEffect(() => {
    if (open) setHidden(false);
  }, [open]);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const hide = intro || (isMobile && hidden);

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-40 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          transform: hide ? 'translateY(-100%)' : 'translateY(0)',
          opacity: mounted ? 1 : 0,
          pointerEvents: hide ? 'none' : 'auto',
        }}
      >
        <div className="glass border-x-0 border-t-0">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
            <Link
              href="/"
              className="group flex items-center transition-transform duration-500 hover:scale-[1.03]"
              onClick={() => setOpen(false)}
              aria-label={siteName}
            >
              <BrandLogo className="h-8 md:h-9" />
            </Link>

            <nav className="hidden items-center gap-1 md:flex" onMouseMove={onNavMove} onMouseLeave={onNavLeave}>
              {NAV.map((item, i) => (
                <Link
                  key={item.href}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  href={item.href}
                  className={`nav-item relative rounded-lg px-4 py-2 font-medium ${
                    isActive(item.href) ? 'is-active text-accent' : 'text-ink-soft hover:text-ink'
                  }`}
                  style={{ fontSize: 'var(--fs-nav)' }}
                >
                  {item.label}
                  <span className="nav-underline" />
                </Link>
              ))}
              <span className="mx-2 h-5 w-px bg-line" />
              <Link
                href="/search"
                aria-label={site.navSearch}
                ref={(el) => {
                  itemRefs.current[NAV.length] = el;
                }}
                className={`nav-item flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:text-accent ${
                  isActive('/search') ? 'text-accent' : 'text-ink-soft'
                }`}
              >
                <SearchIcon />
              </Link>
              <span
                ref={(el) => {
                  itemRefs.current[NAV.length + 1] = el;
                }}
                className="nav-item inline-flex"
              >
                <ThemeToggle />
              </span>
            </nav>

            <div className="flex items-center gap-1 md:hidden">
              <Link
                href="/search"
                aria-label={site.navSearch}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-soft"
              >
                <SearchIcon />
              </Link>
              <ThemeToggle />
              <button
                type="button"
                aria-label={site.navMenu}
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-soft"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  {open ? <path d="m5 5 14 14M19 5 5 19" /> : <path d="M4 7h16M4 12h16M4 17h10" />}
                </svg>
              </button>
            </div>
          </div>

          <div
            className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 md:hidden ${
              open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <nav className="min-h-0">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`relative flex items-center border-t border-line px-6 py-3.5 text-[16px] ${
                    isActive(item.href) ? 'text-accent' : 'text-ink'
                  }`}
                >
                  {isActive(item.href) && (
                    <span className="absolute left-0 top-1/2 h-[18px] w-[2.5px] -translate-y-1/2 rounded-full bg-accent" />
                  )}
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* 回到顶部：毛玻璃圆钮，滚动超过阈值后出现（所有端）。
          挂在 lvh 恒定高度锚容器底部，浏览器工具栏显隐不再引起跳动 */}
      <div className="back-top-anchor">
        <button
          type="button"
          onClick={scrollTop}
          aria-label="回到顶部"
          className={`glass pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full text-ink-soft shadow-[var(--shadow)] transition-opacity duration-300 hover:text-accent ${
            showTop ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <ArrowUpIcon />
        </button>
      </div>
    </>
  );
}
