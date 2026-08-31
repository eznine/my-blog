'use client';

import { TocList, useActiveId } from './toc';
import type { Heading } from '@/lib/md';

/** 桌面端左侧固定目录（xl 及以上）。 */
export function DesktopToc({ headings }: { headings: Heading[] }) {
  const activeId = useActiveId(headings);
  if (headings.length === 0) return null;

  return (
    <nav aria-label="目录" className="sticky top-24 hidden w-60 shrink-0 self-start xl:block">
      <div className="mono-label mb-4 flex items-center gap-2.5">
        <span className="marker-dot is-live !h-[5px] !w-[5px]" />
        INDEX · 目录
      </div>
      <TocList headings={headings} activeId={activeId} />
    </nav>
  );
}
