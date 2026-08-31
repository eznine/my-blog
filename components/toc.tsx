'use client';

import { useEffect, useState } from 'react';
import type { Heading } from '@/lib/md';

export function useActiveId(headings: Heading[]) {
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

export function TocList({ headings, activeId, onNavigate }: { headings: Heading[]; activeId: string; onNavigate?: () => void }) {
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
