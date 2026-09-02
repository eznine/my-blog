'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSite } from './site-provider';

/**
 * 页脚信息区的站点工具：光标光效开关 + 后台入口。
 * 光效偏好持久化在 localStorage（'ez-glow'），切换即时生效（自定义事件通知 CursorGlow）。
 */
export function SiteUtilities() {
  const site = useSite();
  const [glow, setGlow] = useState(true);

  useEffect(() => {
    setGlow(localStorage.getItem('ez-glow') !== 'off');
  }, []);

  const toggleGlow = () => {
    const next = !glow;
    setGlow(next);
    localStorage.setItem('ez-glow', next ? 'on' : 'off');
    window.dispatchEvent(new Event('ez-glow-change'));
  };

  return (
    <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
      <button
        type="button"
        onClick={toggleGlow}
        aria-pressed={glow}
        className="group flex items-center gap-3 rounded-full border border-line px-4 py-2 transition-colors hover:border-accent/60"
      >
        <span className="font-mono text-[12px] tracking-[0.18em] text-ink-soft uppercase transition-colors group-hover:text-ink">
          {site.utilities.glow}
        </span>
        <span
          className={`relative inline-flex h-[18px] w-[34px] items-center rounded-full transition-colors duration-300 ${
            glow ? 'bg-accent' : 'bg-line-strong'
          }`}
        >
          <span
            className={`absolute h-[12px] w-[12px] rounded-full bg-white shadow transition-transform duration-300 ${
              glow ? 'translate-x-[18px]' : 'translate-x-[3px]'
            }`}
          />
        </span>
        <span className={`font-mono text-[11px] tracking-[0.14em] uppercase ${glow ? 'text-accent' : 'text-ink-faint'}`}>
          {glow ? site.utilities.on : site.utilities.off}
        </span>
      </button>

      <Link
        href="/admin"
        className="group flex items-center gap-2.5 rounded-full border border-line px-4 py-2 font-mono text-[12px] tracking-[0.18em] text-ink-faint uppercase transition-colors hover:border-accent/60 hover:text-accent"
      >
        <svg viewBox="0 0 24 24" className="h-[14px] w-[14px]" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="4" y="10" width="16" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
        {site.utilities.admin}
      </Link>
    </div>
  );
}
