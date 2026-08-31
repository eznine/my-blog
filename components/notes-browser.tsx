'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

export interface NoteMeta {
  slug: string;
  title: string;
  date: string;
  summary: string;
  category: string;
  tags: string[];
}

function countBy(items: string[]): [string, number][] {
  const map = new Map<string, number>();
  for (const it of items) map.set(it, (map.get(it) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'));
}

export function NotesBrowser({ notes }: { notes: NoteMeta[] }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [allTagsOpen, setAllTagsOpen] = useState(false);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get('tag');
    const c = sp.get('category');
    const q = sp.get('q');
    if (t) setTag(t);
    if (c) setCategory(c);
    if (q) setQuery(q);
  }, []);

  const categories = useMemo(() => countBy(notes.map((n) => n.category)), [notes]);
  const tags = useMemo(() => countBy(notes.flatMap((n) => n.tags)), [notes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((n) => {
      if (category && n.category !== category) return false;
      if (tag && !n.tags.includes(tag)) return false;
      if (q) {
        const hay = `${n.title} ${n.summary} ${n.category} ${n.tags.join(' ')}`.toLowerCase();
        if (!q.split(/\s+/).every((token) => hay.includes(token))) return false;
      }
      return true;
    });
  }, [notes, query, category, tag]);

  const byYear = useMemo(() => {
    const groups: { year: string; items: NoteMeta[] }[] = [];
    for (const n of filtered) {
      const year = n.date.slice(0, 4);
      const last = groups[groups.length - 1];
      if (last && last.year === year) last.items.push(n);
      else groups.push({ year, items: [n] });
    }
    return groups;
  }, [filtered]);

  const active = category !== null || tag !== null || query.trim() !== '';
  const shownTags = allTagsOpen ? tags : tags.slice(0, 18);

  return (
    <div>
      {/* 搜索栏 */}
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          className="absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-ink-faint"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索笔记标题、摘要或标签…"
          className="w-full rounded-xl border border-line bg-panel py-3.5 pl-12 pr-4 text-[16px] text-ink backdrop-blur placeholder:text-ink-faint transition-all focus:border-accent/60 focus:shadow-[0_0_20px_var(--accent-glow)] focus:outline-none"
        />
      </div>

      {/* 分类 */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="mono-label mr-1">CAT</span>
        <FilterButton active={category === null} onClick={() => setCategory(null)}>
          全部 {notes.length}
        </FilterButton>
        {categories.map(([c, n]) => (
          <FilterButton key={c} active={category === c} onClick={() => setCategory(category === c ? null : c)}>
            {c} {n}
          </FilterButton>
        ))}
      </div>

      {/* 标签 */}
      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="mono-label mr-1">TAG</span>
          {shownTags.map(([t, n]) => (
            <FilterButton key={t} small active={tag === t} onClick={() => setTag(tag === t ? null : t)}>
              {t} {n}
            </FilterButton>
          ))}
          {tags.length > 18 && (
            <button
              type="button"
              onClick={() => setAllTagsOpen((v) => !v)}
              className="font-mono text-[11px] text-accent hover:text-accent-strong"
            >
              {allTagsOpen ? '收起' : `+${tags.length - 18}`}
            </button>
          )}
        </div>
      )}

      {/* 计数 */}
      <div className="mt-6 flex items-center justify-between border-b border-line pb-2.5">
        <span className="mono-label">
          {filtered.length} / {notes.length} 篇
        </span>
        {active && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setCategory(null);
              setTag(null);
            }}
            className="font-mono text-[11px] tracking-wider text-accent hover:text-accent-strong"
          >
            × 清除筛选
          </button>
        )}
      </div>

      {/* 列表（按年分组） */}
      {byYear.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-ink-soft">没有匹配的笔记。</p>
          <p className="mono-label mt-2">NO MATCH · 调整关键词试试</p>
        </div>
      ) : (
        byYear.map((g) => (
          <section key={g.year} className="mt-8">
            <h2 className="font-mono text-[13px] font-semibold tracking-[0.2em] text-accent">{g.year}</h2>
            <ul>
              {g.items.map((n) => (
                <li key={n.slug} className="group border-b border-line">
                  <Link
                    href={`/notes/${n.slug}`}
                    className="flex flex-col gap-1 py-4 transition-colors sm:flex-row sm:items-baseline sm:gap-6"
                  >
                    <span className="w-24 shrink-0 font-mono text-[13px] text-ink-faint">{n.date.slice(5)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="text-[17px] font-semibold text-ink transition-colors group-hover:text-accent">
                        {n.title}
                      </span>
                      {n.summary && (
                        <span className="mt-1 block truncate text-[14px] text-ink-faint">{n.summary}</span>
                      )}
                    </span>
                    <span className="shrink-0 rounded-md border border-line px-2 py-0.5 font-mono text-[12px] text-ink-soft transition-colors group-hover:border-accent/50 group-hover:text-accent">
                      {n.category}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function FilterButton({
  active,
  small,
  onClick,
  children,
}: {
  active: boolean;
  small?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border font-mono transition-colors ${
        small ? 'px-2 py-[3px] text-[12px]' : 'px-3 py-1.5 text-[13px]'
      } ${
        active
          ? 'border-accent/60 bg-accent/10 text-accent'
          : 'border-line text-ink-soft hover:border-accent/50 hover:text-accent'
      }`}
    >
      {children}
    </button>
  );
}
