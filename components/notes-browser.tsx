'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useSite } from '@/components/site-provider';
import { NoteCard } from '@/components/note-card';
import { Reveal } from '@/components/reveal';
import { SparkField } from './spark-field';

export interface NoteMeta {
  slug: string;
  title: string;
  date: string;
  summary: string;
  category: string;
  chapter?: string;
  tags: string[];
  order?: number;
}

type ViewMode = 'atlas' | 'timeline';

function countBy(items: string[]): [string, number][] {
  const map = new Map<string, number>();
  for (const it of items) map.set(it, (map.get(it) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'));
}

/** 章节按名称排序：'01 环境配置' 排在 '02 Web 基础' 前 */
const chapterCollator = new Intl.Collator('zh', { numeric: true });

function sortEntries<T extends string>(
  list: [T, number][],
  order?: T[],
): [T, number][] {
  if (!order?.length) return [...list].sort((a, b) => chapterCollator.compare(a[0], b[0]));
  const idx = new Map(order.map((c, i) => [c, i]));
  return [...list].sort(
    (a, b) =>
      (idx.has(a[0]) ? (idx.get(a[0]) as number) : 1e9) -
        (idx.has(b[0]) ? (idx.get(b[0]) as number) : 1e9) ||
      chapterCollator.compare(a[0], b[0]),
  );
}

export function NotesBrowser({
  notes,
  categoryOrder,
  chapterOrder,
}: {
  notes: NoteMeta[];
  /** 分类展示顺序（来自后台 taxonomy.json，可拖拽排序）；未收录的分类排在后面 */
  categoryOrder?: string[];
  /** 各分类下章节的展示顺序；未收录的章节排在后面 */
  chapterOrder?: Record<string, string[]>;
}) {
  const site = useSite();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [chapter, setChapter] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(false);
  const [allTagsOpen, setAllTagsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('atlas');
  const [ready, setReady] = useState(false);
  const [swapKey, setSwapKey] = useState(0);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get('tag');
    const c = sp.get('category');
    const q = sp.get('q');
    const ch = sp.get('chapter');
    const view = sp.get('view');
    let mode: ViewMode = 'atlas';
    if (view === 'timeline') mode = 'timeline';
    else if (t || q) mode = 'timeline';
    else if (!t && !q) {
      try {
        if (window.localStorage.getItem('notes-view') === 'timeline') mode = 'timeline';
      } catch {
        mode = 'atlas';
      }
    }
    if (t) setTag(t);
    if (c) {
      setCategory(c);
      if (ch) setChapter(ch);
    }
    if (q) setQuery(q);
    if (c && view !== 'timeline') mode = 'atlas';
    setViewMode(mode);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const sp = new URLSearchParams(window.location.search);
    const known = ['q', 'category', 'chapter', 'tag', 'view', 'sort'] as const;
    for (const key of known) sp.delete(key);
    if (query.trim()) sp.set('q', query.trim());
    if (category) sp.set('category', category);
    if (chapter) sp.set('chapter', chapter);
    if (tag) sp.set('tag', tag);
    if (sortAsc) sp.set('sort', 'oldest');
    if (viewMode === 'timeline') sp.set('view', 'timeline');
    const qs = sp.toString();
    const url = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
    window.history.replaceState(null, '', url);
    try {
      window.localStorage.setItem('notes-view', viewMode);
    } catch {
      // 隐私模式等场景下不阻断页面
    }
  }, [ready, query, category, chapter, tag, sortAsc, viewMode]);

  const swap = () => setSwapKey((k) => k + 1);
  const commit = (fn: () => void) => {
    swap();
    fn();
  };

  const categories = useMemo(() => {
    const list = countBy(notes.map((n) => n.category));
    if (!categoryOrder?.length) return list;
    const idx = new Map(categoryOrder.map((c, i) => [c, i]));
    return list.sort(
      (a, b) =>
        (idx.has(a[0]) ? (idx.get(a[0]) as number) : 1e9) -
          (idx.has(b[0]) ? (idx.get(b[0]) as number) : 1e9) ||
        b[1] - a[1] ||
        a[0].localeCompare(b[0], 'zh'),
    );
  }, [notes, categoryOrder]);

  const tags = useMemo(() => countBy(notes.flatMap((n) => n.tags)), [notes]);
  const tagSource = useMemo(
    () => (category ? countBy(notes.filter((n) => n.category === category).flatMap((n) => n.tags)) : tags),
    [notes, category, tags],
  );

  const chaptersFor = (cat: string | null): [string, number][] => {
    if (!cat) return [];
    const rows = countBy(
      notes.filter((n) => n.category === cat && n.chapter).map((n) => n.chapter as string),
    );
    return sortEntries(rows, chapterOrder?.[cat]);
  };

  const categorySummary = useMemo(() => {
    const map = new Map<string, { count: number; latest: NoteMeta | null }>();
    for (const n of notes) {
      const e = map.get(n.category) ?? { count: 0, latest: null };
      e.count += 1;
      if (!e.latest || n.date > e.latest.date) e.latest = n;
      map.set(n.category, e);
    }
    return map;
  }, [notes]);

  const categoryCount = category ? categorySummary.get(category)?.count ?? 0 : 0;
  const currentChapters = useMemo(
    () => chaptersFor(category),
    // chaptersFor 读取 notes/chapterOrder，依赖同一组输入
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notes, category, chapterOrder],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const hit = notes.filter((n) => {
      if (category && n.category !== category) return false;
      if (category && chapter && n.chapter !== chapter) return false;
      if (tag && !n.tags.includes(tag)) return false;
      if (q) {
        const hay = `${n.title} ${n.summary} ${n.category} ${n.chapter ?? ''} ${n.tags.join(' ')}`.toLowerCase();
        if (!q.split(/\s+/).every((token) => hay.includes(token))) return false;
      }
      return true;
    });
    return hit.sort((a, b) => {
      const d = sortAsc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
      if (d !== 0) return d;
      const ao = Number(a.order) || 0;
      const bo = Number(b.order) || 0;
      if (ao !== bo) return ao - bo;
      return a.title.localeCompare(b.title, 'zh');
    });
  }, [notes, query, category, chapter, tag, sortAsc]);

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

  const atlasGroups = useMemo(() => {
    if (!category) return [] as { chapter: string; items: NoteMeta[] }[];
    const groups: { chapter: string; items: NoteMeta[] }[] = [];
    const push = (ch: string, n: NoteMeta) => {
      let g = groups.find((x) => x.chapter === ch);
      if (!g) {
        g = { chapter: ch, items: [] };
        groups.push(g);
      }
      g.items.push(n);
    };
    for (const n of filtered) push(n.chapter ?? site.notesBrowser.noChapter, n);
    if (chapter) return groups.filter((g) => g.chapter === chapter);
    const order = currentChapters.map(([ch]) => ch);
    return groups.sort(
      (a, b) =>
        (order.includes(a.chapter) ? order.indexOf(a.chapter) : order.length) -
          (order.includes(b.chapter) ? order.indexOf(b.chapter) : order.length) ||
        chapterCollator.compare(a.chapter, b.chapter),
    );
  }, [filtered, category, chapter, currentChapters, site]);

  const active = category !== null || tag !== null || query.trim() !== '';
  const shownTags = allTagsOpen ? tagSource : tagSource.slice(0, 18);
  const labelCls = 'mr-1 shrink-0 font-mono tracking-[0.1em] text-ink-soft';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = !!target?.matches?.('input, textarea, [contenteditable="true"]');
      if (e.key === '/' && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (e.key !== 'Escape') return;
      e.preventDefault();
      if (query.trim()) {
        commit(() => setQuery(''));
        return;
      }
      if (tag) {
        commit(() => setTag(null));
        return;
      }
      if (category) {
        commit(() => {
          setCategory(null);
          setChapter(null);
        });
        return;
      }
      if (viewMode === 'timeline') {
        commit(() => {
          setViewMode('atlas');
          setQuery('');
          setTag(null);
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [query, tag, category, viewMode]);

  const enterCategory = (cat: string) => {
    commit(() => {
      setCategory(cat);
      setChapter(null);
    });
  };

  const enterCategoryChapter = (cat: string, ch: string) => {
    commit(() => {
      setCategory(cat);
      setChapter(ch);
    });
  };

  const goAtlasOverview = () => {
    commit(() => {
      setViewMode('atlas');
      setCategory(null);
      setChapter(null);
      setQuery('');
      setTag(null);
    });
  };

  const switchView = (next: ViewMode) => {
    if (next === viewMode) {
      if (next === 'atlas' && category) goAtlasOverview();
      return;
    }
    if (next === 'atlas') {
      goAtlasOverview();
      return;
    }
    commit(() => setViewMode('timeline'));
  };

  const onQueryChange = (v: string) => {
    if (v && viewMode === 'atlas' && !category) {
      commit(() => {
        setViewMode('timeline');
        setQuery(v);
      });
      return;
    }
    setQuery(v);
  };

  const onTagToggle = (t: string) => {
    const next = tag === t ? null : t;
    if (next && viewMode === 'atlas' && !category) {
      commit(() => {
        setViewMode('timeline');
        setTag(next);
      });
      return;
    }
    commit(() => setTag(next));
  };

  const kind = viewMode === 'atlas' && category ? 'detail' : viewMode;
  const swapCls = swapKey > 0 ? 'view-swap' : '';

  return (
    <div>
      {/* 搜索 + 视图切换 */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <svg
            viewBox="0 0 24 24"
            className="absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-ink-faint"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4.5 4.5" />
          </svg>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={site.notesBrowser.placeholder}
            className="w-full rounded-xl border border-line bg-panel py-3.5 pl-12 pr-4 text-[16px] text-ink backdrop-blur placeholder:text-ink-faint transition-all focus:border-accent/60 focus:shadow-[0_0_20px_var(--accent-glow)] focus:outline-none"
          />
        </div>
        <div className="grid shrink-0 grid-cols-2 self-start rounded-xl border border-line bg-panel/70 p-1 backdrop-blur md:self-auto">
          <ViewButton active={viewMode === 'atlas'} onClick={() => switchView('atlas')}>
            {site.notesBrowser.viewAtlas}
          </ViewButton>
          <ViewButton active={viewMode === 'timeline'} onClick={() => switchView('timeline')}>
            {site.notesBrowser.viewTimeline}
          </ViewButton>
        </div>
      </div>

      {kind === 'atlas' && (
        <div key={`atlas-${swapKey}`} className={swapCls}>
          <div className="mt-6 grid gap-5 sm:grid-cols-2" data-glow-grid>
            {categories.map(([cat, count], i) => {
              const sum = categorySummary.get(cat);
              const latest = sum?.latest;
              const rows = chaptersFor(cat);
              const num = String(i + 1).padStart(2, '0');
              const lk = `${latest?.date.slice(5) ?? ''}${latest?.title ? ` · ${latest.title}` : ''}`;
              return (
                <Reveal key={cat} delay={Math.min(i, 3) * 80} className="h-full">
                  <article
                    className="explore-card glow-card group flex h-full cursor-pointer flex-col rounded-2xl p-5 sm:p-6"
                    onClick={() => enterCategory(cat)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        enterCategory(cat);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${cat} ${count} ${site.notesBrowser.notesUnit}`}
                  >
                    <span className="corner" aria-hidden="true" />
                    <span className="card-grid" aria-hidden="true" />
                    <SparkField />
                    <div className="relative flex items-start justify-between gap-3">
                      <span className="mono-label !text-accent">
                        {site.notesBrowser.sheet} {num}
                      </span>
                      <span className="mono-label">
                        {count} {site.notesBrowser.notesUnit}
                      </span>
                    </div>
                    <h2 className="relative mt-4 text-[26px] leading-tight font-bold text-ink transition-colors group-hover:text-accent">
                      {cat}
                    </h2>
                    <div className="relative mt-4 flex min-w-0 flex-col gap-1">
                      {rows.slice(0, 4).map(([ch, n]) => (
                        <button
                          key={ch}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            enterCategoryChapter(cat, ch);
                          }}
                          className="flex min-w-0 items-center rounded-md px-1.5 py-1 text-left transition-colors hover:text-accent"
                        >
                          <span className="truncate text-[15px] text-ink-soft transition-colors group-hover:text-accent">
                            {ch}
                          </span>
                          <span className="leader-dots" aria-hidden="true" />
                          <span className="shrink-0 font-mono text-[12.5px] text-ink-faint transition-colors group-hover:text-accent">
                            {n}
                          </span>
                        </button>
                      ))}
                      {rows.length === 0 && (
                        <div className="flex min-w-0 items-center px-1.5 py-1">
                          <span className="truncate text-[15px] text-ink-soft">
                            {site.notesBrowser.noChapter}
                          </span>
                          <span className="leader-dots" aria-hidden="true" />
                          <span className="shrink-0 font-mono text-[12.5px] text-ink-faint">
                            {count}
                          </span>
                        </div>
                      )}
                      {rows.length > 4 && (
                        <span className="mono-label px-1.5 pt-1 !text-accent">
                          {site.notesBrowser.moreChapters.replace(
                            '{n}',
                            String(rows.length - 4),
                          )}
                        </span>
                      )}
                    </div>
                    <div className="relative mt-auto flex min-w-0 items-center justify-between gap-3 border-t border-line/70 pt-3">
                      <span className="mono-label shrink-0">
                        {site.notesBrowser.lastUpdated}
                      </span>
                      <span className="min-w-0 truncate font-mono text-[13px] text-ink-soft">
                        {lk || '—'}
                      </span>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      )}

      {kind === 'detail' && category && (
        <div key={`detail-${swapKey}`} className={swapCls}>
          <div className="mt-5">
            <button
              type="button"
              onClick={goAtlasOverview}
              className="flex items-center gap-2 rounded-md px-1 py-1 font-mono text-[13px] tracking-[0.08em] text-ink-soft transition-colors hover:text-accent"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path d="M19 12H5m5-6-6 6 6 6" />
              </svg>
              {site.notesBrowser.backToAtlas}
            </button>
          </div>

          <section className="explore-card relative mt-3 rounded-2xl p-6 md:p-7">
            <span className="corner" aria-hidden="true" />
            <span className="card-grid" aria-hidden="true" />
            <SparkField />
            <div className="relative">
              <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                <div className="min-w-0">
                  <span className="mono-label !text-accent">
                    {site.notesBrowser.sheet}{' '}
                    {String(
                      Math.max(
                        1,
                        categories.findIndex(([c]) => c === category) + 1,
                      ),
                    ).padStart(2, '0')}
                  </span>
                  <h2 className="mt-2 text-3xl leading-tight font-bold text-ink">
                    {category}
                  </h2>
                </div>
                <div className="mono-label">
                  {categoryCount} {site.notesBrowser.notesUnit} ·{' '}
                  {currentChapters.length} {site.notesBrowser.chaptersUnit} ·{' '}
                  {site.notesBrowser.lastUpdated}{' '}
                  {categorySummary.get(category)?.latest?.date.slice(5) ?? '—'}
                </div>
              </div>

              {currentChapters.length > 0 && (
                <div className="mt-5 flex gap-2 overflow-x-auto pb-1 overscroll-x-contain [scrollbar-width:thin] [&::-webkit-scrollbar]:h-[3px] [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-0 [&::-webkit-scrollbar-thumb]:bg-line-strong/70 [&::-webkit-scrollbar-track]:bg-transparent">
                  <FilterButton
                    small
                    active={chapter === null}
                    onClick={() => commit(() => setChapter(null))}
                  >
                    {site.notesBrowser.allChapters} {categoryCount}
                  </FilterButton>
                  {currentChapters.map(([ch, n]) => (
                    <FilterButton
                      key={ch}
                      small
                      active={chapter === ch}
                      onClick={() => commit(() => setChapter(chapter === ch ? null : ch))}
                    >
                      {ch} {n}
                    </FilterButton>
                  ))}
                </div>
              )}
            </div>
          </section>

          <TagRow
            tags={tagSource}
            shownTags={shownTags}
            allTagsOpen={allTagsOpen}
            activeTag={tag}
            onToggle={onTagToggle}
            onToggleAll={() => setAllTagsOpen((v) => !v)}
          />

          <CountBar
            count={filtered.length}
            total={categoryCount}
            category={category}
            chapter={chapter}
            tag={tag}
            query={query}
            active={Boolean(query.trim() || tag || chapter)}
            onClearCategory={() =>
              commit(() => {
                setCategory(null);
                setChapter(null);
              })
            }
            onClearChapter={() => commit(() => setChapter(null))}
            onClearTag={() => commit(() => setTag(null))}
            onClearQuery={() => commit(() => setQuery(''))}
            onClearAll={() =>
              commit(() => {
                setQuery('');
                setChapter(null);
                setTag(null);
              })
            }
          />

          {atlasGroups.length === 0 ? (
            <EmptyState />
          ) : (
            atlasGroups.map((g, gi) => (
              <section key={g.chapter} className="mt-7">
                <div className="flex min-w-0 items-baseline gap-3">
                  <span className="shrink-0 font-mono text-[15px] font-semibold text-accent">
                    {String(gi + 1).padStart(2, '0')}
                  </span>
                  <h3 className="min-w-0 flex-none truncate text-lg leading-tight font-semibold text-ink">
                    {g.chapter}
                  </h3>
                  <span className="leader-dots" aria-hidden="true" />
                  <span className="mono-label shrink-0">
                    {g.items.length} {site.notesBrowser.notesUnit}
                  </span>
                </div>
                <div className="mt-3 flex flex-col gap-4">
                  {g.items.map((n, i) => (
                    <Reveal key={n.slug} delay={Math.min(gi * 3 + i, 5) * 45} className="h-full">
                      <NoteCard note={n} />
                    </Reveal>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      )}

      {kind === 'timeline' && (
        <div key={`timeline-${swapKey}`} className={swapCls}>
          {/* 分类 */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className={labelCls} style={{ fontSize: 'var(--fs-filter)' }}>
              {site.notesBrowser.cat}
            </span>
            <FilterButton active={category === null} onClick={() => commit(() => {
              setCategory(null);
              setChapter(null);
            })}>
              {site.notesBrowser.all} {notes.length}
            </FilterButton>
            {categories.map(([c, n]) => (
              <FilterButton
                key={c}
                active={category === c}
                onClick={() =>
                  commit(() => {
                    setCategory(category === c ? null : c);
                    if (category === c) setChapter(null);
                  })
                }
              >
                {c} {n}
              </FilterButton>
            ))}
          </div>

          {/* 章节面板：选中分类后展开，真实占位挤开下方内容 */}
          <ChapterPanel
            open={category !== null && currentChapters.length > 0}
            category={category}
            chapters={currentChapters}
            categoryCount={categoryCount}
            activeChapter={chapter}
            onSelect={(ch) => commit(() => setChapter(ch))}
          />

          <TagRow
            tags={tagSource}
            shownTags={shownTags}
            allTagsOpen={allTagsOpen}
            activeTag={tag}
            onToggle={onTagToggle}
            onToggleAll={() => setAllTagsOpen((v) => !v)}
          />

          {/* 排序 */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={labelCls} style={{ fontSize: 'var(--fs-filter)' }}>
              {site.notesBrowser.sort}
            </span>
            <FilterButton active={!sortAsc} onClick={() => commit(() => setSortAsc(false))}>
              {site.notesBrowser.sortNewest}
            </FilterButton>
            <FilterButton active={sortAsc} onClick={() => commit(() => setSortAsc(true))}>
              {site.notesBrowser.sortOldest}
            </FilterButton>
          </div>

          <CountBar
            count={filtered.length}
            total={notes.length}
            category={category}
            chapter={chapter}
            tag={tag}
            query={query}
            active={active}
            onClearCategory={() =>
              commit(() => {
                setCategory(null);
                setChapter(null);
              })
            }
            onClearChapter={() => commit(() => setChapter(null))}
            onClearTag={() => commit(() => setTag(null))}
            onClearQuery={() => commit(() => setQuery(''))}
            onClearAll={() =>
              commit(() => {
                setQuery('');
                setCategory(null);
                setChapter(null);
                setTag(null);
              })
            }
          />

          {byYear.length === 0 ? (
            <EmptyState />
          ) : (
            byYear.map((g, gi) => (
              <section key={g.year} className="mt-6">
                <h2 className="font-mono text-base font-semibold tracking-[0.2em] text-accent">
                  {g.year}
                </h2>
                <div className="mt-2 flex flex-col gap-4">
                  {g.items.map((n, i) => (
                    <Reveal key={n.slug} delay={Math.min(gi * 3 + i, 5) * 55} className="h-full">
                      <NoteCard note={n} />
                    </Reveal>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3.5 py-2 font-mono text-[13px] tracking-[0.12em] transition-all duration-200 ${
        active
          ? 'bg-accent text-white shadow-[0_0_14px_var(--accent-glow)]'
          : 'text-ink-soft hover:text-accent'
      }`}
    >
      {children}
    </button>
  );
}

/**
 * 章节面板：点选分类后展开（grid-rows 0fr→1fr 过渡），真实占位把
 * 标签/排序/列表往下挤开，不悬浮不重叠；章节行横向滑动选择。
 */
function ChapterPanel({
  open,
  category,
  chapters,
  categoryCount,
  activeChapter,
  onSelect,
}: {
  open: boolean;
  category: string | null;
  chapters: [string, number][];
  categoryCount: number;
  activeChapter: string | null;
  onSelect: (ch: string | null) => void;
}) {
  const site = useSite();
  return (
    <div
      className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out ${
        open ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      }`}
      inert={!open}
    >
      <div className="overflow-hidden">
        <div className="rounded-xl border border-line bg-panel/70 p-3.5 backdrop-blur">
          <div className="mb-2.5 flex items-baseline justify-between gap-3">
            <span className="mono-label truncate" style={{ fontSize: 'var(--fs-filter)' }}>
              {category} · {site.notesBrowser.chap}
            </span>
            <span className="mono-label shrink-0 text-accent">
              {activeChapter ?? site.notesBrowser.allChapters}
            </span>
          </div>
          <div
            className={`flex gap-2 overflow-x-auto pb-1 overscroll-x-contain [scrollbar-width:thin] [&::-webkit-scrollbar]:h-[3px] [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-0 [&::-webkit-scrollbar-thumb]:bg-line-strong/70 [&::-webkit-scrollbar-track]:bg-transparent ${
              open ? '' : 'pointer-events-none'
            }`}
          >
            <FilterButton small active={activeChapter === null} onClick={() => onSelect(null)}>
              {site.notesBrowser.allChapters} {categoryCount}
            </FilterButton>
            {chapters.map(([ch, n]) => (
              <FilterButton
                key={ch}
                small
                active={activeChapter === ch}
                onClick={() => onSelect(activeChapter === ch ? null : ch)}
              >
                {ch} {n}
              </FilterButton>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TagRow({
  tags,
  shownTags,
  allTagsOpen,
  activeTag,
  onToggle,
  onToggleAll,
}: {
  tags: [string, number][];
  shownTags: [string, number][];
  allTagsOpen: boolean;
  activeTag: string | null;
  onToggle: (tag: string) => void;
  onToggleAll: () => void;
}) {
  const site = useSite();
  if (tags.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="mr-1 shrink-0 font-mono tracking-[0.1em] text-ink-soft" style={{ fontSize: 'var(--fs-filter)' }}>
        {site.notesBrowser.tag}
      </span>
      {shownTags.map(([t, n]) => (
        <FilterButton key={t} small active={activeTag === t} onClick={() => onToggle(t)}>
          {t} {n}
        </FilterButton>
      ))}
      {tags.length > 18 && (
        <button
          type="button"
          onClick={onToggleAll}
          className="font-mono text-[11px] text-accent hover:text-accent-strong"
        >
          {allTagsOpen ? site.notesBrowser.collapse : `+${tags.length - 18}`}
        </button>
      )}
    </div>
  );
}

function CountBar({
  count,
  total,
  category,
  chapter,
  tag,
  query,
  active,
  onClearCategory,
  onClearChapter,
  onClearTag,
  onClearQuery,
  onClearAll,
}: {
  count: number;
  total: number;
  category: string | null;
  chapter: string | null;
  tag: string | null;
  query: string;
  active: boolean;
  onClearCategory: () => void;
  onClearChapter: () => void;
  onClearTag: () => void;
  onClearQuery: () => void;
  onClearAll: () => void;
}) {
  const site = useSite();
  const tokens: { label: string; onClear: () => void }[] = [];
  if (category) {
    tokens.push({
      label: `${site.notesBrowser.cat} · ${category}`,
      onClear: onClearCategory,
    });
    if (chapter) {
      tokens.push({
        label: `${site.notesBrowser.chap} · ${chapter}`,
        onClear: onClearChapter,
      });
    }
  }
  if (tag) tokens.push({ label: `${site.notesBrowser.tag} · ${tag}`, onClear: onClearTag });
  if (query.trim()) {
    tokens.push({ label: `Q · ${query.trim()}`, onClear: onClearQuery });
  }

  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="mono-label">
          {site.notesBrowser.count
            .replace('{filtered}', String(count))
            .replace('{total}', String(total))}
        </span>
        {tokens.map((tok) => (
          <button
            key={tok.label}
            type="button"
            onClick={tok.onClear}
            title={site.notesBrowser.clear}
            className="flex max-w-full items-center gap-1.5 rounded-md border border-accent/45 bg-accent/10 px-2 py-1 font-mono text-[11.5px] text-accent transition-colors hover:border-accent/70 hover:bg-accent/15"
          >
            <span className="truncate">{tok.label}</span>
            <span aria-hidden="true">×</span>
          </button>
        ))}
      </div>
      {active && (
        <button
          type="button"
          onClick={onClearAll}
          className="shrink-0 font-mono text-[11px] tracking-wider text-accent hover:text-accent-strong"
        >
          {site.notesBrowser.clear}
        </button>
      )}
    </div>
  );
}

function EmptyState() {
  const site = useSite();
  return (
    <div className="py-16 text-center">
      <p className="text-sm text-ink-soft">{site.notesBrowser.empty}</p>
      <p className="mono-label mt-2">{site.notesBrowser.emptyLabel}</p>
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
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border font-mono transition-all duration-200 will-change-transform active:translate-y-0 ${
        small ? 'px-2 py-[3px]' : 'px-3 py-1.5'
      } shrink-0 whitespace-nowrap ${
        active
          ? 'border-accent/60 bg-accent/10 text-accent shadow-[0_0_10px_rgba(255,75,51,0.08)]'
          : 'border-line text-ink-soft hover:-translate-y-0.5 hover:border-accent/60 hover:text-accent hover:shadow-[0_0_14px_rgba(255,75,51,0.10)]'
      }`}
      style={{ fontSize: 'var(--fs-filter)' }}
    >
      {children}
    </button>
  );
}
