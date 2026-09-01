'use client';

import { useMemo, useRef, useState } from 'react';
import type { PostListItem } from './api';

/** 与前端笔记页一致的排序：日期 → order（同日手拖）→ 标题 */
function sortPosts(list: PostListItem[], asc: boolean): PostListItem[] {
  return [...list].sort((a, b) => {
    const d = asc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
    if (d !== 0) return d;
    const ao = Number(a.order) || 0;
    const bo = Number(b.order) || 0;
    if (ao !== bo) return ao - bo;
    return a.title.localeCompare(b.title, 'zh');
  });
}

/**
 * 后台「预览」视图：模拟前端笔记页的排列（按天分组 → 日期排序 → 同一天手拖调整顺序）。
 * 整行展示不进入编辑（尾部保留「编辑」按钮）；同一天有 2 篇以上时可在组内拖拽换位，
 * 松手即保存 order（随前台生效）。
 */
export function ListPreview({
  posts,
  typeLabel,
  onEdit,
  onReorder,
}: {
  posts: PostListItem[];
  typeLabel: string;
  onEdit: (slug: string) => void;
  onReorder: (list: { slug: string; order: number }[]) => Promise<void> | void;
}) {
  const [asc, setAsc] = useState(false); // false = 最新在前
  const [items, setItems] = useState<PostListItem[]>(() => sortPosts(posts, false));
  const [dropTarget, setDropTarget] = useState<{ date: string; slug: string } | null>(null);
  const dragSlug = useRef<string | null>(null);

  /** 按天分组（组顺序 = 日期顺序，组内保持当前手排顺序） */
  const groups = useMemo(() => {
    const map = new Map<string, PostListItem[]>();
    for (const p of items) {
      const arr = map.get(p.date) || [];
      arr.push(p);
      map.set(p.date, arr);
    }
    return [...map.entries()].map(([date, arr]) => ({ date, items: arr }));
  }, [items]);

  const switchOrder = (next: boolean) => {
    setAsc(next);
    setItems(sortPosts(items, next)); // 组顺序变化，同日组内顺序保持（order 较大者被拖过）
  };

  const handleDrop = (date: string, targetSlug: string) => {
    const from = dragSlug.current;
    dragSlug.current = null;
    setDropTarget(null);
    if (!from || from === targetSlug) return;
    const g = groups.find((x) => x.date === date);
    if (!g || g.items.length < 2) return;
    const fromIdx = g.items.findIndex((x) => x.slug === from);
    if (fromIdx < 0) return;
    const toIdx = g.items.findIndex((x) => x.slug === targetSlug);
    const next = [...g.items];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setItems(groups.flatMap((x) => (x.date === date ? next : x.items)));
    void onReorder(next.map((p, i) => ({ slug: p.slug, order: i })));
  };

  return (
    <div className="mt-6 rounded-2xl border border-line">
      {/* 预览头部：排序切换 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-panel/30 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="mono-label !text-accent">PREVIEW · {typeLabel}</span>
          <span className="hidden font-mono text-[11px] text-ink-faint lg:inline">
            同一日期内可直接拖动调整顺序 · 点「编辑」进入编辑器
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="mono-label text-[11px] text-ink-faint">日期</span>
          <button
            onClick={() => switchOrder(false)}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
              !asc ? 'bg-accent text-white' : 'border border-line text-ink-soft hover:text-ink'
            }`}
          >
            最新在前
          </button>
          <button
            onClick={() => switchOrder(true)}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
              asc ? 'bg-accent text-white' : 'border border-line text-ink-soft hover:text-ink'
            }`}
          >
            最早在前
          </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="px-5 py-10 text-center text-[14px] text-ink-faint">暂无文章</p>
      ) : (
        groups.map((g) => (
          <section key={g.date}>
            <h3 className="flex items-center gap-2.5 border-b border-line/60 bg-panel/20 px-5 py-2 font-mono text-[13px] tracking-[0.14em] text-accent">
              {g.date}
              <span className="font-mono text-[11px] font-normal text-ink-faint">{g.items.length} 篇</span>
              {g.items.length > 1 && (
                <span className="font-mono text-[11px] font-normal text-ink-faint/70">⠿ 可拖动调整顺序</span>
              )}
            </h3>
            {g.items.map((p, i) => {
              const draggable = g.items.length > 1;
              const isTarget = dropTarget?.date === g.date && dropTarget.slug === p.slug;
              return (
                <div
                  key={p.slug}
                  draggable={draggable}
                  onDragStart={(e) => {
                    dragSlug.current = p.slug;
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    if (draggable && dragSlug.current && dragSlug.current !== p.slug) {
                      e.preventDefault();
                      setDropTarget({ date: g.date, slug: p.slug });
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(g.date, p.slug);
                  }}
                  onDragEnd={() => {
                    dragSlug.current = null;
                    setDropTarget(null);
                  }}
                  className={`flex w-full items-center gap-3 border-b border-line/60 px-5 py-3 transition-colors last:border-0 ${
                    draggable ? 'cursor-grab active:cursor-grabbing' : ''
                  } ${isTarget ? 'border-t-2 border-t-accent bg-accent/5' : ''} ${
                    draggable ? 'hover:bg-accent/[0.03]' : ''
                  }`}
                >
                  <span className="w-12 shrink-0 font-mono text-[11px] text-ink-faint">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {draggable && (
                    <span title="按住拖动调整同日顺序" className="shrink-0 text-[13px] text-ink-faint">
                      ⠿
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">
                    {p.title || p.slug}
                  </span>
                  {p.category && (
                    <span className="hidden shrink-0 rounded-md border border-accent/40 px-2 py-0.5 font-mono text-[12px] text-accent sm:inline">
                      {p.category}
                      {p.chapter ? ` / ${p.chapter}` : ''}
                    </span>
                  )}
                  <button
                    onClick={() => onEdit(p.slug)}
                    title={`编辑 ${p.title || p.slug}`}
                    className="shrink-0 rounded-md border border-line px-2.5 py-1 font-mono text-[11px] tracking-[0.08em] text-ink-soft transition-colors hover:border-accent/50 hover:text-accent"
                  >
                    EDIT →
                  </button>
                </div>
              );
            })}
          </section>
        ))
      )}
    </div>
  );
}