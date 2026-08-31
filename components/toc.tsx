'use client';

import { useEffect, useState } from 'react';
import type { Heading } from '@/lib/md';

function useActiveId(headings: Heading[]) {
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    if (headings.length === 0) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const offset = 130;
      let current = headings[0].id;
      for (const h of headings) {
        const el = document.getElementById(h.id);
        if (el && el.getBoundingClientRect().top <= offset) current = h.id;
      }
      setActiveId(current);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [headings]);

  return activeId;
}

function TocList({ headings, activeId, onNavigate }: { headings: Heading[]; activeId: string; onNavigate?: () => void }) {
  return (
    <ul className="space-y-1 border-l border-line text-[15px]">
      {headings.map((h) => (
        <li key={h.id}>
          <a
            href={`#${h.id}`}
            onClick={onNavigate}
            className={`-ml-px block border-l-2 py-1.5 pr-2 leading-snug transition-all ${
              h.depth === 3 ? 'pl-7' : 'pl-4'
            } ${
              activeId === h.id
                ? 'border-accent font-semibold text-accent'
                : 'border-transparent text-ink-soft hover:translate-x-1 hover:text-ink'
            }`}
          >
            {h.text}
          </a>
        </li>
      ))}
    </ul>
  );
}

/** 桌面端：左侧固定目录；窄屏：文章顶部下拉目录。 */
export function ArticleToc({ headings }: { headings: Heading[] }) {
  const activeId = useActiveId(headings);
  const [open, setOpen] = useState(false);

  if (headings.length === 0) return null;

  return (
    <>
      {/* 窄屏下拉目录 */}
      <div className="mb-8 xl:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between rounded-xl border border-line bg-panel px-5 py-3.5 text-left backdrop-blur transition-colors hover:border-accent/50"
        >
          <span className="flex items-center gap-2.5 font-mono text-[13px] tracking-[0.18em] text-ink-soft uppercase">
            <span className="marker-dot is-live !h-[5px] !w-[5px]" />
            目录 · {headings.length} 节
          </span>
          <svg
            viewBox="0 0 24 24"
            className={`h-4 w-4 text-ink-faint transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <div
          className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ${
            open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <nav className="min-h-0">
            <div className="mt-2 rounded-xl border border-line bg-panel px-5 py-4 backdrop-blur">
              <TocList headings={headings} activeId={activeId} onNavigate={() => setOpen(false)} />
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}

export { TocList, useActiveId };
