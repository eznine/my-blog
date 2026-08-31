'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { searchItems, type SearchItem } from '@/lib/search-core';

const TYPE_ORDER: SearchItem['type'][] = ['note', 'research', 'project'];

export function SearchClient({ items }: { items: SearchItem[] }) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<SearchItem['type'] | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) setQuery(q);
  }, []);

  const hits = useMemo(() => searchItems(items, query), [items, query]);
  const filtered = useMemo(
    () => (typeFilter ? hits.filter((h) => h.type === typeFilter) : hits),
    [hits, typeFilter]
  );
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of hits) map.set(h.type, (map.get(h.type) ?? 0) + 1);
    return map;
  }, [hits]);

  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

  return (
    <div>
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          className="absolute left-4 top-1/2 h-[19px] w-[19px] -translate-y-1/2 text-ink-faint"
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
          autoFocus
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索全部笔记、研究与项目…"
          className="w-full rounded-lg border border-line bg-panel py-3.5 pl-12 pr-4 text-[17px] text-ink backdrop-blur placeholder:text-ink-faint transition-all focus:border-accent/60 focus:shadow-[0_0_22px_var(--accent-glow)] focus:outline-none"
        />
      </div>

      {tokens.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mono-label mr-1">TYPE</span>
            <button
              type="button"
              onClick={() => setTypeFilter(null)}
              className={`rounded-sm border px-2.5 py-1 font-mono text-[13px] transition-colors ${
                typeFilter === null
                  ? 'border-accent/60 bg-accent/10 text-accent'
                  : 'border-line text-ink-soft hover:border-accent/50 hover:text-accent'
              }`}
            >
              全部 {hits.length}
            </button>
            {TYPE_ORDER.filter((t) => counts.get(t)).map((t) => {
              const label = items.find((i) => i.type === t)!.typeLabel;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(typeFilter === t ? null : t)}
                  className={`rounded-sm border px-2.5 py-1 font-mono text-[13px] transition-colors ${
                    typeFilter === t
                      ? 'border-accent/60 bg-accent/10 text-accent'
                      : 'border-line text-ink-soft hover:border-accent/50 hover:text-accent'
                  }`}
                >
                  {label} {counts.get(t)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6">
        {tokens.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-sm text-ink-soft">输入关键词开始搜索，支持标题、标签、分类与正文。</p>
            <p className="mono-label mt-2">SEARCH INDEX · {items.length} DOCS</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-sm text-ink-soft">没有找到匹配「{query}」的内容。</p>
            <p className="mono-label mt-2">NO MATCH</p>
          </div>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {filtered.slice(0, 50).map((hit) => (
              <li key={hit.url}>
                <Link href={hit.url} className="group block py-4">
                  <div className="flex items-baseline gap-3">
                    <span className="shrink-0 rounded-sm border border-line px-1.5 py-[2px] font-mono text-[11px] tracking-widest text-ink-soft group-hover:border-accent group-hover:text-accent">
                      {hit.typeLabel}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[18px] font-semibold text-ink group-hover:text-accent">
                      <Highlight text={hit.title} tokens={tokens} />
                    </span>
                    <span className="shrink-0 font-mono text-[12.5px] text-ink-faint">{hit.date}</span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 pl-[72px] text-[14.5px] leading-relaxed text-ink-soft">
                    <Highlight text={hit.snippet} tokens={tokens} />
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Highlight({ text, tokens }: { text: string; tokens: string[] }) {
  if (tokens.length === 0) return <>{text}</>;
  const lower = text.toLowerCase();
  const ranges: [number, number][] = [];
  for (const token of tokens) {
    let i = lower.indexOf(token);
    while (i !== -1) {
      ranges.push([i, i + token.length]);
      i = lower.indexOf(token, i + token.length);
    }
  }
  if (ranges.length === 0) return <>{text}</>;
  ranges.sort((a, b) => a[0] - b[0]);

  const merged: [number, number][] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }

  const parts: React.ReactNode[] = [];
  let pos = 0;
  merged.forEach(([s, e], i) => {
    if (s > pos) parts.push(text.slice(pos, s));
    parts.push(
      <mark key={i} className="rounded-[2px] bg-accent/20 px-0.5 !text-accent">
        {text.slice(s, e)}
      </mark>
    );
    pos = e;
  });
  if (pos < text.length) parts.push(text.slice(pos));
  return <>{parts}</>;
}
