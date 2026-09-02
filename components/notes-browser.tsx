'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSite } from '@/components/site-provider';
import { NoteCard } from '@/components/note-card';
import { Reveal } from '@/components/reveal';

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

function countBy(items: string[]): [string, number][] {
  const map = new Map<string, number>();
  for (const it of items) map.set(it, (map.get(it) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'));
}

/** 章节按名称排序：'01 环境配置' 排在 '02 Web 基础' 前 */
const chapterCollator = new Intl.Collator('zh', { numeric: true });

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
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [chapter, setChapter] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(false);
  const [allTagsOpen, setAllTagsOpen] = useState(false);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get('tag');
    const c = sp.get('category');
    const q = sp.get('q');
    const ch = sp.get('chapter');
    if (t) setTag(t);
    if (c) {
      setCategory(c);
      if (ch) setChapter(ch);
    }
    if (q) setQuery(q);
  }, []);

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

  /** 选中分类下的章节——优先按后台保存的顺序（可拖拽排序），未收录的按名称排序垫后 */
  const chapters = useMemo(() => {
    if (!category) return [] as [string, number][];
    const list = countBy(
      notes.filter((n) => n.category === category && n.chapter).map((n) => n.chapter as string),
    );
    const order = chapterOrder?.[category];
    if (order?.length) {
      const idx = new Map(order.map((c, i) => [c, i]));
      list.sort(
        (a, b) =>
          (idx.has(a[0]) ? (idx.get(a[0]) as number) : 1e9) -
            (idx.has(b[0]) ? (idx.get(b[0]) as number) : 1e9) ||
          chapterCollator.compare(a[0], b[0]),
      );
    } else {
      list.sort((a, b) => chapterCollator.compare(a[0], b[0]));
    }
    return list;
  }, [notes, category, chapterOrder]);

  const categoryCount = useMemo(
    () => (category ? notes.filter((n) => n.category === category).length : 0),
    [notes, category],
  );

  const pickCategory = (c: string | null) => {
    setCategory(c);
    setChapter(null);
  };

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
      // 同一天：先按后台预览里拖拽设定的 order，再按标题（与后台预览一致）
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

  const active = category !== null || tag !== null || query.trim() !== '';
  const shownTags = allTagsOpen ? tags : tags.slice(0, 18);
  const labelCls = 'mr-1 font-mono tracking-[0.1em] text-ink-soft';

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
          placeholder={site.notesBrowser.placeholder}
          className="w-full rounded-xl border border-line bg-panel py-3.5 pl-12 pr-4 text-[16px] text-ink backdrop-blur placeholder:text-ink-faint transition-all focus:border-accent/60 focus:shadow-[0_0_20px_var(--accent-glow)] focus:outline-none"
        />
      </div>

      {/* 分类 */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className={labelCls} style={{ fontSize: 'var(--fs-filter)' }}>{site.notesBrowser.cat}</span>
        <FilterButton active={category === null} onClick={() => pickCategory(null)}>
          {site.notesBrowser.all} {notes.length}
        </FilterButton>
        {categories.map(([c, n]) => (
          <FilterButton key={c} active={category === c} onClick={() => pickCategory(category === c ? null : c)}>
            {c} {n}
          </FilterButton>
        ))}
      </div>

      {/* 章节面板：选中分类后展开，真实占位挤开下方内容 */}
      <ChapterPanel
        open={category !== null && chapters.length > 0}
        category={category}
        chapters={chapters}
        categoryCount={categoryCount}
        activeChapter={chapter}
        onSelect={(ch) => setChapter(ch)}
      />

      {/* 标签 */}
      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={labelCls} style={{ fontSize: 'var(--fs-filter)' }}>{site.notesBrowser.tag}</span>
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
              {allTagsOpen ? site.notesBrowser.collapse : `+${tags.length - 18}`}
            </button>
          )}
        </div>
      )}

      {/* 排序 */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={labelCls} style={{ fontSize: 'var(--fs-filter)' }}>{site.notesBrowser.sort}</span>
        <FilterButton active={!sortAsc} onClick={() => setSortAsc(false)}>
          {site.notesBrowser.sortNewest}
        </FilterButton>
        <FilterButton active={sortAsc} onClick={() => setSortAsc(true)}>
          {site.notesBrowser.sortOldest}
        </FilterButton>
      </div>

      {/* 计数 */}
      <div className="mt-6 flex items-center justify-between border-b border-line pb-2.5">
        <span className="mono-label">
          {site.notesBrowser.count.replace('{filtered}', String(filtered.length)).replace('{total}', String(notes.length))}
        </span>
        {active && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              pickCategory(null);
              setTag(null);
            }}
            className="font-mono text-[11px] tracking-wider text-accent hover:text-accent-strong"
          >
            {site.notesBrowser.clear}
          </button>
        )}
      </div>

      {/* 列表（按年分组，卡片一行一个竖排） */}
      {byYear.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-ink-soft">{site.notesBrowser.empty}</p>
          <p className="mono-label mt-2">{site.notesBrowser.emptyLabel}</p>
        </div>
      ) : (
        byYear.map((g, gi) => (
          <section key={g.year} className="mt-8">
            <h2 className="font-mono text-base font-semibold tracking-[0.2em] text-accent">{g.year}</h2>
            <div className="mt-3 flex flex-col gap-4">
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
      className={`rounded-md border font-mono transition-all duration-200 will-change-transform active:translate-y-0 ${
        small ? 'px-2 py-[3px]' : 'px-3 py-1.5'
      } ${
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
