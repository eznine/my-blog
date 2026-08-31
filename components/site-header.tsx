'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ThemeToggle } from './theme-toggle';
import { BrandLogo } from './brand-logo';

const NAV = [
  { href: '/', label: '首页' },
  { href: '/notes', label: '笔记' },
  { href: '/research', label: '研究' },
  { href: '/projects', label: '项目' },
  { href: '/archive', label: '归档' },
  { href: '/about', label: '关于' },
];

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
}

export function SiteHeader({ siteName }: { siteName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const rafRef = useRef<number>(0);

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
  useEffect(() => () => magRaf.current && cancelAnimationFrame(magRaf.current), []);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  useEffect(() => {
    if (pathname !== '/') {
      setProgress(null);
      return;
    }

    const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
    const update = () => {
      const hero = document.querySelector('.hero-scroll-section');
      if (!hero) {
        setProgress(null);
        return;
      }
      const rect = hero.getBoundingClientRect();
      const total = Math.max(1, hero.offsetHeight - window.innerHeight);
      const p = clamp01(-rect.top / total);
      setProgress(p);
      rafRef.current = 0;
    };
    const onScroll = () => {
      if (!rafRef.current) rafRef.current = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', update);
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', update);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [pathname]);

  // 非首页：直接显示；首页：滚动驱动 p
  const p = progress ?? 1;
  const opacity = p;
  const y = -16 * (1 - p);

  return (
    <header
      className="fixed inset-x-0 top-0 z-40 transition-all duration-75"
      style={{ opacity, transform: `translateY(${y}px)`, pointerEvents: p > 0.15 ? 'auto' : 'none' }}
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
                className={`nav-item relative rounded-lg px-4 py-2 text-[15px] font-medium ${
                  isActive(item.href) ? 'is-active text-accent' : 'text-ink-soft hover:text-ink'
                }`}
              >
                {item.label}
                <span className="nav-underline" />
              </Link>
            ))}
            <span className="mx-2 h-5 w-px bg-line" />
            <Link
              href="/search"
              aria-label="搜索"
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
              aria-label="搜索"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-soft"
            >
              <SearchIcon />
            </Link>
            <ThemeToggle />
            <button
              type="button"
              aria-label="打开菜单"
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
  );
}
